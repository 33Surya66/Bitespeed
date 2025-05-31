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
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const identifyController_1 = require("./controllers/identifyController");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const errorHandler_1 = require("./middlewares/errorHandler");
const node_cron_1 = __importDefault(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("./utils/logger"));
const client_1 = require("@prisma/client");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Bitespeed Identity Reconciliation API',
            version: '1.0.0',
            description: 'API for consolidating customer contact information'
        },
        servers: [
            { url: 'https://bitespeed-identity.onrender.com' }
        ]
    },
    apis: ['./src/controllers/*.ts']
};
const swaggerDocs = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerDocs));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});
// Identify endpoint
app.post('/identify', (req, res) => (0, identifyController_1.identifyContact)(req, res, prisma));
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Self-pinging to keep Render service alive
const BASE_URL = process.env.RENDER_URL || 'https://bitespeed-identity.onrender.com';
node_cron_1.default.schedule('*/10 * * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield axios_1.default.get(`${BASE_URL}/health`);
        logger_1.default.info('Self-ping successful');
    }
    catch (error) {
        logger_1.default.error(`Self-ping failed: ${error}`);
    }
}));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger_1.default.info(`Server running on port ${PORT}`);
});
