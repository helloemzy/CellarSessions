import { VercelRequest, VercelResponse } from '@vercel/node';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface WineLabelRecognitionRequest {
  image: string; // base64 encoded image
}

export interface WineLabelRecognitionResponse {
  winery?: string;
  wine_name?: string;
  vintage?: number;
  region?: string;
  grape_variety?: string;
  confidence?: number;
  raw_text?: string[];
}

export interface VoiceTranscriptionRequest {
  audio: string; // base64 encoded audio
  language?: string;
}

export interface VoiceTranscriptionResponse {
  transcript: string;
  confidence?: number;
  language?: string;
  duration?: number;
}

export interface WineSearchRequest {
  query?: string;
  winery?: string;
  region?: string;
  grape_variety?: string;
  vintage?: number;
  price_min?: number;
  price_max?: number;
  limit?: number;
  offset?: number;
}

export interface WineRecommendationRequest {
  user_id: string;
  preferences?: {
    grape_varieties?: string[];
    regions?: string[];
    price_range?: [number, number];
    style?: string;
  };
  limit?: number;
}

export type ApiHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>;