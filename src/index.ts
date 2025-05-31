import express from 'express';
import helmet from 'helmet';
import { identifyContact } from './controllers/identifyController';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middlewares/errorHandler';
import cron from 'node-cron';
import axios from 'axios';
import logger from './utils/logger';

const app = express();

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
      { url: 'https://bitespeed-identity.onrender.com' }
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
app.post('/identify', identifyContact);

// Error handling middleware
app.use(errorHandler);

// Self-pinging to keep Render service alive
const BASE_URL = process.env.RENDER_URL || 'https://bitespeed-identity.onrender.com';
cron.schedule('*/10 * * * *', async () => {
  try {
    await axios.get(`${BASE_URL}/health`);
    logger.info('Self-ping successful');
  } catch (error) {
    logger.error(`Self-ping failed: ${error}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});