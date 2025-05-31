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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyContact = void 0;
const zod_1 = require("zod");
const logger_1 = __importDefault(require("../utils/logger"));
const contactSchema = zod_1.z.object({
    email: zod_1.z.string().email().nullable().optional(),
    phoneNumber: zod_1.z.string().nullable().optional()
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
const identifyContact = (req, res, prisma) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info(`Request: ${JSON.stringify(req.body)}`);
    try {
        const parsed = contactSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ error: parsed.error.message });
        }
        const { email, phoneNumber } = parsed.data;
        // Find existing contacts
        const existingContacts = yield prisma.contact.findMany({
            where: {
                OR: [
                    { email: email !== null && email !== void 0 ? email : undefined },
                    { phoneNumber: phoneNumber !== null && phoneNumber !== void 0 ? phoneNumber : undefined }
                ]
            }
        });
        if (existingContacts.length === 0) {
            // Create new primary contact
            const newContact = yield prisma.contact.create({
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
        const primaryContact = existingContacts.reduce((prev, curr) => prev.createdAt < curr.createdAt ? prev : curr);
        // Update other contacts to secondary
        for (const contact of existingContacts) {
            if (contact.id !== primaryContact.id && contact.linkPrecedence === 'primary') {
                yield prisma.contact.update({
                    where: { id: contact.id },
                    data: {
                        linkPrecedence: 'secondary',
                        linkedId: primaryContact.id
                    }
                });
            }
        }
        // Create new secondary contact if new data
        if (!existingContacts.some(c => c.email === email && c.phoneNumber === phoneNumber)) {
            yield prisma.contact.create({
                data: {
                    email,
                    phoneNumber,
                    linkPrecedence: 'secondary',
                    linkedId: primaryContact.id
                }
            });
        }
        // Fetch all related contacts
        const allContacts = yield prisma.contact.findMany({
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
    }
    catch (error) {
        logger_1.default.error(`Error: ${error}`);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.identifyContact = identifyContact;
