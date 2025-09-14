import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSuccess, validateMethod } from './_utils/response';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, ['GET'])) return;

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      google_vision: !!process.env.GOOGLE_VISION_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
    }
  };

  sendSuccess(res, healthStatus, 'API is healthy');
}