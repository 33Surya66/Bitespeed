import { Request, Response } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response
) => {
  logger.error(`Error: ${err.message}`);
  return res.status(500).json({ error: 'Internal server error' });
}; 