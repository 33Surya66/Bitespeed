import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response) => {
  // Log the full error details
  logger.error('Error details:', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });

  // Ensure we have a valid response object
  if (!res) {
    logger.error('No response object available');
    return;
  }

  // Ensure response methods are available
  if (typeof res.status !== 'function') {
    logger.error('Response status method not available');
    return;
  }

  if (typeof res.json !== 'function') {
    logger.error('Response json method not available');
    return;
  }

  try {
    // Handle different types of errors
    if (err instanceof ZodError) {
      res.status(400).json({
        error: 'At least one of email or phoneNumber is required'
      });
      return;
    }

    // Handle other errors
    res.status(500).json({
      error: err.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // If we can't even log the error, at least try to console.error
    console.error('Critical error in error handler:', error);
    logger.error('Critical error in error handler:', error);
  }
}; 