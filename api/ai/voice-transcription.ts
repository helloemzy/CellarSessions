import { VercelRequest, VercelResponse } from '@vercel/node';
import { sendSuccess, sendError, validateMethod, validateRequiredFields } from '../_utils/response';
import { VoiceTranscriptionRequest, VoiceTranscriptionResponse } from '../_utils/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!validateMethod(req, res, ['POST'])) return;

  try {
    const { audio, language = 'en' } = req.body as VoiceTranscriptionRequest;
    
    if (!validateRequiredFields(req, res, ['audio'])) return;

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return sendError(res, 'OpenAI API key not configured', 500);
    }

    // Convert base64 audio to Buffer
    let audioBuffer: Buffer;
    try {
      // Remove data URL prefix if present
      const base64Audio = audio.replace(/^data:audio\/[^;]+;base64,/, '');
      audioBuffer = Buffer.from(base64Audio, 'base64');
    } catch (error) {
      return sendError(res, 'Invalid audio data format', 400);
    }

    // Create FormData for OpenAI API
    const formData = new FormData();
    
    // Create a Blob from the audio buffer
    const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    // Call OpenAI Whisper API
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData
    });

    if (!transcriptionResponse.ok) {
      const errorData = await transcriptionResponse.text();
      console.error('OpenAI API error:', errorData);
      return sendError(res, 'Failed to transcribe audio with OpenAI API', 500);
    }

    const transcriptionData = await transcriptionResponse.json();

    if (transcriptionData.error) {
      console.error('OpenAI API returned error:', transcriptionData.error);
      return sendError(res, `OpenAI API error: ${transcriptionData.error.message}`, 400);
    }

    // Process the transcription for wine-related content
    const processedTranscript = processWineTranscript(transcriptionData.text);

    const result: VoiceTranscriptionResponse = {
      transcript: processedTranscript,
      confidence: transcriptionData.confidence || calculateTranscriptionConfidence(transcriptionData.text),
      language: transcriptionData.language || language,
      duration: transcriptionData.duration
    };

    sendSuccess(res, result, 'Voice transcription completed successfully');

  } catch (error) {
    console.error('Voice transcription error:', error);
    sendError(res, 'Internal server error during voice transcription', 500);
  }
}

function processWineTranscript(transcript: string): string {
  if (!transcript) return '';

  // Wine-specific processing
  let processed = transcript.toLowerCase();

  // Common wine term corrections
  const corrections: { [key: string]: string } = {
    'shardonnay': 'chardonnay',
    'shablis': 'chablis',
    'pino noir': 'pinot noir',
    'pino grigio': 'pinot grigio',
    'merlot': 'merlot',
    'cabarnet': 'cabernet',
    'savier blanc': 'sauvignon blanc',
    'riesling': 'riesling',
    'shirah': 'shiraz',
    'temperanio': 'tempranillo',
    'bordo': 'bordeaux',
    'burgundy': 'burgundy',
    'nappa valley': 'napa valley',
    'sonoma': 'sonoma',
    'tuscanny': 'tuscany',
    'chianti': 'chianti',
    'barossa': 'barossa valley'
  };

  for (const [incorrect, correct] of Object.entries(corrections)) {
    const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
    processed = processed.replace(regex, correct);
  }

  // Capitalize proper nouns
  processed = processed.replace(/\b(napa valley|sonoma|bordeaux|burgundy|champagne|chianti|rioja|tuscany|piedmont|barossa valley|margaret river|marlborough|mendoza|stellenbosch|douro|rhone valley)\b/gi, 
    (match) => match.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  // Capitalize grape varieties
  processed = processed.replace(/\b(cabernet sauvignon|merlot|pinot noir|chardonnay|sauvignon blanc|riesling|syrah|shiraz|grenache|tempranillo|sangiovese|nebbiolo|pinot grigio|pinot gris|gewurztraminer|viognier|chenin blanc|semillon|malbec|carmenere|zinfandel)\b/gi,
    (match) => match.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  );

  // Capitalize first letter of sentences
  processed = processed.replace(/(^\w|[.!?]\s*\w)/g, (match) => match.toUpperCase());

  return processed.trim();
}

function calculateTranscriptionConfidence(transcript: string): number {
  if (!transcript) return 0;
  
  // Basic confidence calculation based on transcript quality
  let confidence = 50; // Base confidence
  
  // Add confidence for wine-related terms
  const wineTerms = ['wine', 'vintage', 'tasting', 'notes', 'flavor', 'aroma', 'bouquet', 'finish', 'grape', 'vineyard', 'winery', 'cellar'];
  const foundTerms = wineTerms.filter(term => transcript.toLowerCase().includes(term));
  confidence += foundTerms.length * 5;
  
  // Add confidence for proper sentence structure
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 0) {
    confidence += Math.min(sentences.length * 2, 20);
  }
  
  // Penalize very short transcripts
  if (transcript.length < 10) {
    confidence -= 20;
  }
  
  // Penalize transcripts with many repetitions
  const words = transcript.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words).size;
  if (words.length > 0 && uniqueWords / words.length < 0.5) {
    confidence -= 15;
  }
  
  return Math.max(0, Math.min(100, confidence));
}