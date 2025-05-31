import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction 
) => {
  logger.error('Error:', err.message);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'At least one of email or phoneNumber is required'
    });
  }

  return res.status(500).json({
    error: 'Internal server error'
  });
};
