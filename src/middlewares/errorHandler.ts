import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response) => {
  // Log only essential error information
  logger.error('Error occurred:', {
    message: err.message,
    name: err.name,
    path: req.path,
    method: req.method
  });

  try {
    // Handle different types of errors
    if (err instanceof ZodError) {
      if (res && typeof res.status === 'function' && typeof res.json === 'function') {
        res.status(400).json({
          error: 'At least one of email or phoneNumber is required'
        });
      }
      return;
    }

    // Handle other errors
    if (res && typeof res.status === 'function' && typeof res.json === 'function') {
      res.status(500).json({
        error: err.message || 'Internal server error'
      });
    }
  } catch (error) {
    logger.error('Error in error handler:', {
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 