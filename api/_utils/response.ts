import { VercelResponse } from '@vercel/node';
import { ApiResponse } from './types';

export const sendSuccess = <T>(
  res: VercelResponse,
  data: T,
  message?: string,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message
  };
  
  res.status(statusCode).json(response);
};

export const sendError = (
  res: VercelResponse,
  error: string,
  statusCode: number = 400,
  data?: any
): void => {
  const response: ApiResponse = {
    success: false,
    error,
    data
  };
  
  res.status(statusCode).json(response);
};

export const handleCors = (res: VercelResponse): void => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Accept, Origin, User-Agent');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json');
};

export const validateMethod = (
  req: any,
  res: VercelResponse,
  allowedMethods: string[]
): boolean => {
  handleCors(res);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  
  if (!allowedMethods.includes(req.method)) {
    sendError(res, `Method ${req.method} not allowed`, 405);
    return false;
  }
  
  return true;
};

export const validateApiKey = (req: any, res: VercelResponse): boolean => {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  const validApiKey = process.env.API_SECRET_KEY;
  
  if (!validApiKey) {
    // If no API key is configured, allow all requests (development mode)
    return true;
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    sendError(res, 'Invalid or missing API key', 401);
    return false;
  }
  
  return true;
};

export const validateRequiredFields = (
  req: any,
  res: VercelResponse,
  fields: string[]
): boolean => {
  const missing = fields.filter(field => !req.body[field]);
  
  if (missing.length > 0) {
    sendError(res, `Missing required fields: ${missing.join(', ')}`, 400);
    return false;
  }
  
  return true;
};