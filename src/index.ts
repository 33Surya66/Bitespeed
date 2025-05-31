import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { identifyContact } from './controllers/identifyController';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import cron from 'node-cron';
import axios from 'axios';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Middleware setup
app.use(helmet());
app.use(express.json());

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
      { url: process.env.RENDER_URL || 'https://bitespeed-identity-b1dq.onrender.com' }
    ]
  },
  apis: ['./src/controllers/*.ts']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  try {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Health check failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ status: 'ERROR', message: 'Health check failed' });
  }
});

// Identify endpoint with error handling
app.post('/identify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await identifyContact(req, res, prisma);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware - must be last
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (!res.headersSent) {
    errorHandler(err, req, res);
  }
});

// Self-pinging to keep Render service alive
const BASE_URL = process.env.RENDER_URL || 'https://bitespeed-identity-b1dq.onrender.com';
cron.schedule('*/10 * * * *', async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    if (response.status === 200) {
      logger.info('Self-ping successful');
    } else {
      logger.warn('Self-ping returned non-200 status:', response.status);
    }
  } catch (error) {
    logger.error('Self-ping failed:', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});