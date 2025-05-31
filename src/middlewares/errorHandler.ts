import { Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response) => {
  // Log the error
  logger.error('Error:', err);

  // Handle different types of errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'At least one of email or phoneNumber is required'
    });
  }

  // Handle other errors
  return res.status(500).json({
    error: err.message || 'Internal server error'
  });
}; 