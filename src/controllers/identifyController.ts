import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface IdentifyRequest {
  email?: string;
  phoneNumber?: string;
}

interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

export const identifyContact = async (req: Request, res: Response) => {
  const { email, phoneNumber }: IdentifyRequest = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'At least one of email or phoneNumber is required' });
  }

  try {
    // Find contacts matching email or phoneNumber
    let existingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber || undefined },
        ],
        deletedAt: null,
      },
    });

    // If no existing contacts, create a new primary contact
    if (existingContacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: 'primary',
        },
      });

      return res.status(200).json({
        contact: {
          primaryContatctId: newContact.id,
          emails: newContact.email ? [newContact.email] : [],
          phoneNumbers: newContact.phoneNumber ? [newContact.phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Find the primary contact (earliest createdAt)
    let primaryContact = existingContacts.reduce((prev, curr) =>
      prev.createdAt < curr.createdAt ? prev : curr
    );

    // Check if we need to create a new secondary contact
    const hasNewInfo =
      (email && !existingContacts.some((c) => c.email === email)) ||
      (phoneNumber && !existingContacts.some((c) => c.phoneNumber === phoneNumber));

    if (hasNewInfo) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkedId: primaryContact.id,
          linkPrecedence: 'secondary',
        },
      });

      existingContacts.push(newContact);
    }

    // Handle case where primary contacts need to be linked
    const primaryContacts = existingContacts.filter((c) => c.linkPrecedence === 'primary');
    if (primaryContacts.length > 1) {
      // Keep the oldest as primary, make others secondary
      const oldestPrimary = primaryContacts.reduce((prev, curr) =>
        prev.createdAt < curr.createdAt ? prev : curr
      );

      for (const contact of primaryContacts) {
        if (contact.id !== oldestPrimary.id) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              linkedId: oldestPrimary.id,
              linkPrecedence: 'secondary',
              updatedAt: new Date(),
            },
          });
        }
      }

      // Refresh contacts after updating
      primaryContact = oldestPrimary;
      existingContacts = await prisma.contact.findMany({
        where: {
          OR: [
            { id: primaryContact.id },
            { linkedId: primaryContact.id },
          ],
          deletedAt: null,
        },
      });
    }

    // Prepare response
    const emails = Array.from(new Set(existingContacts.map((c) => c.email).filter(Boolean)));
    const phoneNumbers = Array.from(new Set(existingContacts.map((c) => c.phoneNumber).filter(Boolean)));
    const secondaryContactIds = existingContacts
      .filter((c) => c.linkPrecedence === 'secondary')
      .map((c) => c.id);

    // Ensure primary contact's email/phoneNumber is first
    if (primaryContact.email) {
      emails.sort((a, b) => (a === primaryContact.email ? -1 : 1));
    }
    if (primaryContact.phoneNumber) {
      phoneNumbers.sort((a, b) => (a === primaryContact.phoneNumber ? -1 : 1));
    }

    return res.status(200).json({
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};