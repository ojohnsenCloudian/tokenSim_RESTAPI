// Error handling utilities

import { Response } from 'express';
import { ApiError } from '../types';

export class AppError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const sendError = (res: Response, error: Error | AppError): void => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error.message || 'Internal server error';
  
  const apiError = {
    success: false,
    error: {
      name: error.name || 'Error',
      message,
      statusCode,
    },
    timestamp: new Date().toISOString(),
  };
  
  res.status(statusCode).json(apiError);
};

export const handleAsync = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

