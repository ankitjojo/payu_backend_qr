import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';

export const errorMiddleware = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error processing request ${req.method} ${req.url}: ${error.message}`);

  res.status(500).json({
    status: 'error',
    message: 'An internal server error occurred',
  });
};
