import express from 'express';
import helmet from 'helmet';
import { identifyContact } from './controllers/identifyController';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import cron from 'node-cron';
import axios from 'axios';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const app = express();
const prisma = new PrismaClient();

// Run migrations before starting the server
try {
  logger.info('Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  logger.info('Database migrations completed successfully');
} catch (error) {
  logger.error('Failed to run database migrations:', error);
  process.exit(1);
}

// Basic middleware
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
      { url: 'https://bitespeed-identity-b1dq.onrender.com' }
    ]
  },
  apis: ['./src/controllers/*.ts']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Identify endpoint
app.post('/identify', (req, res) => {
  identifyContact(req, res, prisma);
});

// Error handling middleware
app.use(errorHandler);

// Self-pinging to keep Render service alive
const RENDER_URL = process.env.RENDER_URL || 'https://bitespeed-identity-b1dq.onrender.com';
cron.schedule('*/10 * * * *', async () => {
  try {
    await axios.get(`${RENDER_URL}/health`);
    logger.info('Self-ping successful');
  } catch (error) {
    logger.error('Self-ping failed:', error);
  }
});

// Ensure we're using the PORT environment variable
const PORT = parseInt(process.env.PORT || '3000', 10);

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`);
});