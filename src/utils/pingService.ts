import cron from 'node-cron';
import axios from 'axios';
import logger from './logger';

const RENDER_URL = process.env.RENDER_URL || 'https://your-app-name.onrender.com';

export const startPingService = () => {
  // Schedule a ping every 14 minutes (Render's timeout is 15 minutes)
  cron.schedule('*/14 * * * *', async () => {
    try {
      const response = await axios.get(`${RENDER_URL}/health`);
      logger.info(`Ping successful: ${response.status}`);
    } catch (error) {
      logger.error('Ping failed:', error);
    }
  });

  logger.info('Ping service started');
}; 