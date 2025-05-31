import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error(`Error: ${err.message || 'Unknown error'}`);
  
  // Ensure response object is valid
  if (!res || typeof res.status !== 'function') {
    logger.error('Invalid response object in error handler');
    return;
  }

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({ error: 'Database error' });
  }

  // Default error response
  return res.status(500).json({ error: 'Internal server error' });
}; 