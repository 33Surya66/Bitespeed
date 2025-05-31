"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const identifyController_1 = require("../identifyController");
const client_1 = require("@prisma/client");
jest.mock('@prisma/client');
const mockPrisma = {
    contact: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
};
client_1.PrismaClient.mockImplementation(() => mockPrisma);
describe('identifyContact', () => {
    let req;
    let res;
    let status;
    let json;
    beforeEach(() => {
        json = jest.fn();
        status = jest.fn().mockReturnValue({ json });
        req = { body: {} };
        res = { status };
        // Reset all mocks before each test
        jest.clearAllMocks();
    });
    it('should return 400 if no email or phoneNumber provided', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, identifyController_1.identifyContact)(req, res, mockPrisma);
        expect(status).toHaveBeenCalledWith(400);
        expect(json).toHaveBeenCalledWith({ error: 'At least one of email or phoneNumber is required' });
    }));
    it('should create new primary contact if none exists', () => __awaiter(void 0, void 0, void 0, function* () {
        req.body = { email: 'test@hillvalley.edu', phoneNumber: '123456' };
        mockPrisma.contact.findMany.mockResolvedValue([]);
        mockPrisma.contact.create.mockResolvedValue({
            id: 1,
            email: 'test@hillvalley.edu',
            phoneNumber: '123456',
            linkPrecedence: 'primary'
        });
        yield (0, identifyController_1.identifyContact)(req, res, mockPrisma);
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            contact: {
                primaryContatctId: 1,
                emails: ['test@hillvalley.edu'],
                phoneNumbers: ['123456'],
                secondaryContactIds: []
            }
        });
    }));
});
