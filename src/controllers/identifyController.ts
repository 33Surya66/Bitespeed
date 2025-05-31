import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import logger from '../utils/logger';

// Define the Contact type based on the Prisma schema
type Contact = {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const contactSchema = z.object({
  email: z.string().email().nullable().optional(),
  phoneNumber: z.string().nullable().optional()
}).refine(data => data.email || data.phoneNumber, {
  message: 'At least one of email or phoneNumber is required'
});

/**
 * @swagger
 * /identify:
 *   post:
 *     summary: Identify and consolidate contact information
 *     tags: [Contacts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 nullable: true
 *               phoneNumber:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Consolidated contact information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 contact:
 *                   type: object
 *                   properties:
 *                     primaryContatctId:
 *                       type: integer
 *                     emails:
 *                       type: array
 *                       items:
 *                         type: string
 *                     phoneNumbers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     secondaryContactIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *       400:
 *         description: Invalid input
 */
export const identifyContact = async (req: Request, res: Response, prisma: PrismaClient) => {
  logger.info(`Request: ${JSON.stringify(req.body)}`);
  try {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.error(`Validation error: ${parsed.error.message}`);
      return res.status(400).json({ error: 'At least one of email or phoneNumber is required' });
    }

    const { email, phoneNumber } = parsed.data;

    // Find existing contacts (exclude soft-deleted)
    const existingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email ?? undefined },
          { phoneNumber: phoneNumber ?? undefined }
        ],
        deletedAt: null
      }
    });

    // If no contacts exist, create a new primary contact
    if (existingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'primary'
        }
      });

      logger.info(`Created new primary contact: ${newContact.id}`);
      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: []
        }
      });
    }

    // Find the oldest primary contact
    let primaryContact = existingContacts.reduce((prev: Contact, curr: Contact) =>
      prev.createdAt < curr.createdAt ? prev : curr
    );

    // If the primary contact is secondary, find its primary
    if (primaryContact.linkPrecedence === 'secondary' && primaryContact.linkedId) {
      const linkedPrimary = await prisma.contact.findFirst({
        where: { id: primaryContact.linkedId, deletedAt: null }
      });
      if (linkedPrimary) {
        primaryContact = linkedPrimary;
      }
    }

    // Update other primary contacts to secondary
    for (const contact of existingContacts) {
      if (contact.id !== primaryContact.id && contact.linkPrecedence === 'primary') {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: 'secondary',
            linkedId: primaryContact.id,
            updatedAt: new Date()
          }
        });
        logger.info(`Updated contact ${contact.id} to secondary, linked to ${primaryContact.id}`);
      }
    }

    // Create a new secondary contact if new data
    const exactMatch = existingContacts.find(
      (c: Contact) => c.email === email && c.phoneNumber === phoneNumber
    );
    if (!exactMatch) {
      const newSecondary = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'secondary',
          linkedId: primaryContact.id
        }
      });
      existingContacts.push(newSecondary);
      logger.info(`Created new secondary contact: ${newSecondary.id}`);
    }

    // Fetch all related contacts
    const allContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id }
        ],
        deletedAt: null
      }
    });

    // For the Link and Merge Primary case, we need to include all contacts that share the same email
    const matchingEmails = new Set<string>();
    if (email) {
      matchingEmails.add(email);
      // Add any other emails from contacts that share this email
      allContacts.forEach((contact: Contact) => {
        if (contact.email === email) {
          allContacts.forEach((c: Contact) => {
            if (c.email) matchingEmails.add(c.email);
          });
        }
      });
    }

    // Consolidate unique emails and phone numbers
    const emails = [...new Set(allContacts
      .filter((c: Contact) => !email || (c.email && matchingEmails.has(c.email)))
      .map((c: Contact) => c.email)
      .filter((e: string | null): e is string => !!e))];
    const phoneNumbers = [...new Set(allContacts.map((c: Contact) => c.phoneNumber).filter((p: string | null): p is string => !!p))];
    const secondaryContactIds = allContacts
      .filter((c: Contact) => c.linkPrecedence === 'secondary')
      .map((c: Contact) => c.id);

    logger.info(`Returning consolidated contact: ${primaryContact.id}`);
    return res.status(200).json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds
      }
    });
  } catch (error) {
    logger.error(`Error: ${error}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
};