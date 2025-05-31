import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import logger from '../utils/logger';

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
      return res.status(400).json({ error: parsed.error.message });
    }

    const { email, phoneNumber } = parsed.data;

    // Find existing contacts
    const existingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email ?? undefined },
          { phoneNumber: phoneNumber ?? undefined }
        ]
      }
    });

    if (existingContacts.length === 0) {
      // Create new primary contact
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'primary'
        }
      });

      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: []
        }
      });
    }

    // Determine primary contact (oldest by createdAt)
    const primaryContact = existingContacts.reduce((prev, curr) =>
      prev.createdAt < curr.createdAt ? prev : curr
    );

    // Update other contacts to secondary
    for (const contact of existingContacts) {
      if (contact.id !== primaryContact.id && contact.linkPrecedence === 'primary') {
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: 'secondary',
            linkedId: primaryContact.id
          }
        });
      }
    }

    // Create new secondary contact if new data
    if (
      !existingContacts.some(c => c.email === email && c.phoneNumber === phoneNumber)
    ) {
      await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'secondary',
          linkedId: primaryContact.id
        }
      });
    }

    // Fetch all related contacts
    const allContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: primaryContact.id },
          { linkedId: primaryContact.id }
        ]
      }
    });

    const emails = [...new Set(allContacts.map(contact => contact.email).filter(Boolean))];
    const phoneNumbers = [...new Set(allContacts.map(contact => contact.phoneNumber).filter(Boolean))];
    const secondaryContactIds = allContacts
      .filter(contact => contact.linkPrecedence === 'secondary')
      .map(contact => contact.id);

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