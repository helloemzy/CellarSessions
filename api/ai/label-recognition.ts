import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSuccess, sendError, validateMethod, validateRequiredFields } from '../_utils/response';
import { WineLabelRecognitionRequest, WineLabelRecognitionResponse } from '../_utils/types';

interface GoogleVisionResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      boundingPoly: any;
    }>;
    fullTextAnnotation?: {
      text: string;
    };
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, ['POST'])) return;

  try {
    const { image } = req.body as WineLabelRecognitionRequest;
    
    if (!validateRequiredFields(req, res, ['image'])) return;

    const googleVisionApiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!googleVisionApiKey) {
      return sendError(res, 'Google Vision API key not configured', 500);
    }

    // Prepare the request to Google Vision API
    const visionRequest = {
      requests: [
        {
          image: {
            content: image.replace(/^data:image\/[a-z]+;base64,/, '') // Remove data URL prefix if present
          },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 50 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
          ]
        }
      ]
    };

    // Call Google Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(visionRequest)
      }
    );

    if (!visionResponse.ok) {
      const errorData = await visionResponse.text();
      console.error('Google Vision API error:', errorData);
      return sendError(res, 'Failed to process image with Google Vision API', 500);
    }

    const visionData: GoogleVisionResponse = await visionResponse.json();
    const response = visionData.responses[0];

    if (response.error) {
      console.error('Vision API returned error:', response.error);
      return sendError(res, `Vision API error: ${response.error.message}`, 400);
    }

    // Extract text from the response
    const rawText = response.textAnnotations?.map(annotation => annotation.description) || [];
    const fullText = response.fullTextAnnotation?.text || '';

    // Parse wine information from the extracted text
    const wineInfo = parseWineInfo(rawText, fullText);

    const result: WineLabelRecognitionResponse = {
      ...wineInfo,
      raw_text: rawText,
      confidence: calculateConfidence(wineInfo)
    };

    sendSuccess(res, result, 'Wine label processed successfully');

  } catch (error) {
    console.error('Label recognition error:', error);
    sendError(res, 'Internal server error during label recognition', 500);
  }
}

function parseWineInfo(rawText: string[], fullText: string): Partial<WineLabelRecognitionResponse> {
  const text = fullText.toLowerCase();
  const textArray = rawText.map(t => t.toLowerCase());
  
  const wineInfo: Partial<WineLabelRecognitionResponse> = {};

  // Extract vintage (4-digit year, typically 1900-2030)
  const vintageMatch = text.match(/\b(19|20)\d{2}\b/);
  if (vintageMatch) {
    const year = parseInt(vintageMatch[0]);
    if (year >= 1900 && year <= new Date().getFullYear() + 5) {
      wineInfo.vintage = year;
    }
  }

  // Common wine regions
  const regions = [
    'napa valley', 'sonoma', 'bordeaux', 'burgundy', 'champagne', 'chianti', 'rioja',
    'barossa valley', 'margaret river', 'marlborough', 'mendoza', 'stellenbosch',
    'douro', 'rhone valley', 'tuscany', 'piedmont', 'oregon', 'washington',
    'california', 'france', 'italy', 'spain', 'australia', 'new zealand',
    'argentina', 'south africa', 'portugal', 'germany'
  ];
  
  for (const region of regions) {
    if (text.includes(region)) {
      wineInfo.region = region.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      break;
    }
  }

  // Common grape varieties
  const grapes = [
    'cabernet sauvignon', 'merlot', 'pinot noir', 'chardonnay', 'sauvignon blanc',
    'riesling', 'syrah', 'shiraz', 'grenache', 'tempranillo', 'sangiovese',
    'nebbiolo', 'pinot grigio', 'pinot gris', 'gewurztraminer', 'viognier',
    'chenin blanc', 'semillon', 'malbec', 'carmenere', 'zinfandel'
  ];
  
  for (const grape of grapes) {
    if (text.includes(grape)) {
      wineInfo.grape_variety = grape.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      break;
    }
  }

  // Extract potential winery name (usually larger text at the top)
  // Look for text that doesn't match common wine terms
  const commonTerms = ['wine', 'vintage', 'reserve', 'estate', 'cellars', 'winery', 'valley', 'red', 'white', 'dry', 'sweet'];
  const potentialWinery = textArray.find(text => 
    text.length > 3 && 
    text.length < 30 && 
    !commonTerms.some(term => text.includes(term)) &&
    !text.match(/\d/) && // Exclude text with numbers
    text.split(' ').length <= 3 // Prefer shorter names
  );
  
  if (potentialWinery) {
    wineInfo.winery = potentialWinery.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Extract potential wine name
  const potentialWineName = textArray.find(text => 
    text.length > 3 && 
    text.length < 50 && 
    !commonTerms.some(term => text === term) &&
    text !== wineInfo.winery?.toLowerCase() &&
    text !== wineInfo.region?.toLowerCase() &&
    text !== wineInfo.grape_variety?.toLowerCase()
  );
  
  if (potentialWineName) {
    wineInfo.wine_name = potentialWineName.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  return wineInfo;
}

function calculateConfidence(wineInfo: Partial<WineLabelRecognitionResponse>): number {
  let confidence = 0;
  
  if (wineInfo.winery) confidence += 30;
  if (wineInfo.wine_name) confidence += 25;
  if (wineInfo.vintage) confidence += 20;
  if (wineInfo.region) confidence += 15;
  if (wineInfo.grape_variety) confidence += 10;
  
  return Math.min(confidence, 100);
}