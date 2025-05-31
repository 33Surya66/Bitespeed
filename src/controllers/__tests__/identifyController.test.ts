import { Request, Response } from 'express';
import { identifyContact } from '../identifyController';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

// Define the type for our mock Prisma client
type MockPrismaClient = {
  contact: {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

const mockPrisma: MockPrismaClient = {
  contact: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
};

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('identifyContact', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let status: jest.Mock;
  let json: jest.Mock;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    req = { body: {} };
    res = { status };
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should return 400 if no email or phoneNumber provided', async () => {
    await identifyContact(req as Request, res as Response, mockPrisma as unknown as PrismaClient);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ error: 'At least one of email or phoneNumber is required' });
  });

  it('should create new primary contact if none exists', async () => {
    req.body = { email: 'test@hillvalley.edu', phoneNumber: '123456' };
    mockPrisma.contact.findMany.mockResolvedValue([]);
    mockPrisma.contact.create.mockResolvedValue({
      id: 1,
      email: 'test@hillvalley.edu',
      phoneNumber: '123456',
      linkPrecedence: 'primary'
    });

    await identifyContact(req as Request, res as Response, mockPrisma as unknown as PrismaClient);
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      contact: {
        primaryContatctId: 1,
        emails: ['test@hillvalley.edu'],
        phoneNumbers: ['123456'],
        secondaryContactIds: []
      }
    });
  });
});