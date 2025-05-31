import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response) => {
  // Log the full error details
  logger.error('Error details:', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  try {
    // Check if response object is valid and has required methods
    if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
      logger.error('Invalid response object:', {
        hasRes: !!res,
        hasStatus: res && typeof res.status === 'function',
        hasJson: res && typeof res.json === 'function'
      });
      return;
    }

    // Handle different types of errors
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "At least one of email or phoneNumber is required"
      });
    }

    // Handle other errors
    return res.status(500).json({
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If we can't even log the error, at least try to console.error
    console.error('Critical error in error handler:', error);
    logger.error('Critical error in error handler:', error);
  }
}; 