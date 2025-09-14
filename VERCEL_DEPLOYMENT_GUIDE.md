# CellarSessions Vercel API Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the CellarSessions backend API to Vercel. The deployment includes serverless functions for wine label recognition, voice transcription, wine database operations, and mobile app CORS support.

## Prerequisites

Before deploying, ensure you have:

1. **Vercel Account**: Create a free account at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **API Keys**: Obtain the following API keys:
   - Google Vision API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Supabase project URL and service role key from [Supabase Dashboard](https://app.supabase.com)

## Deployment Steps

### 1. Project Setup

```bash
# Navigate to your project directory
cd /path/to/CellarSessions

# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Initialize Vercel project
vercel
```

Follow the prompts:
- **Set up and deploy**: Yes
- **Which scope**: Select your account/team
- **Link to existing project**: No (unless you have one)
- **What's your project's name**: cellarsessions-api (or your preferred name)
- **In which directory is your code located**: ./

### 2. Environment Variables Configuration

Set up environment variables in your Vercel dashboard or via CLI:

```bash
# Using Vercel CLI
vercel env add SUPABASE_URL production
# Enter: https://your-project-id.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: your-supabase-service-role-key

vercel env add GOOGLE_VISION_API_KEY production
# Enter: your-google-vision-api-key

vercel env add OPENAI_API_KEY production
# Enter: sk-your-openai-api-key

# Optional: API secret for additional security
vercel env add API_SECRET_KEY production
# Enter: your-optional-api-secret-key

vercel env add NODE_ENV production
# Enter: production
```

**Alternative: Web Dashboard Method**

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each environment variable with the values from `.env.production`

### 3. Deploy to Production

```bash
# Deploy to production
vercel --prod
```

Your API will be deployed and accessible at: `https://your-project-name.vercel.app`

## API Endpoints

Once deployed, your API will have the following endpoints:

### Health Check
- **GET** `/api/health`
- **Description**: Check API status and service availability
- **Response**: Service health status and configuration

### Wine Label Recognition
- **POST** `/api/ai/label-recognition`
- **Description**: Analyze wine label images using Google Vision API
- **Body**: `{ "image": "base64-encoded-image" }`
- **Response**: Wine information extracted from label

### Voice Transcription
- **POST** `/api/ai/voice-transcription`
- **Description**: Transcribe voice notes using OpenAI Whisper
- **Body**: `{ "audio": "base64-encoded-audio", "language": "en" }`
- **Response**: Transcribed text with wine-specific processing

### Wine Search
- **GET/POST** `/api/wine/search`
- **Description**: Search wine database with filters
- **Parameters**: `query`, `winery`, `region`, `grape_variety`, `vintage`, `price_min`, `price_max`, `limit`, `offset`
- **Response**: Paginated wine search results

### Wine Recommendations
- **POST** `/api/wine/recommendations`
- **Description**: Get personalized wine recommendations
- **Body**: `{ "user_id": "string", "preferences": {...}, "limit": 10 }`
- **Response**: Personalized wine recommendations with explanations

## Testing Your Deployment

### 1. Health Check Test

```bash
curl https://your-project-name.vercel.app/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "version": "1.0.0",
    "environment": "production",
    "services": {
      "google_vision": true,
      "openai": true,
      "supabase": true
    }
  },
  "message": "API is healthy"
}
```

### 2. Wine Label Recognition Test

```bash
curl -X POST https://your-project-name.vercel.app/api/ai/label-recognition \
  -H "Content-Type: application/json" \
  -d '{"image":"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="}'
```

### 3. Voice Transcription Test

```bash
curl -X POST https://your-project-name.vercel.app/api/ai/voice-transcription \
  -H "Content-Type: application/json" \
  -d '{"audio":"base64-audio-data","language":"en"}'
```

### 4. Wine Search Test

```bash
curl "https://your-project-name.vercel.app/api/wine/search?query=cabernet&limit=5"
```

### 5. Wine Recommendations Test

```bash
curl -X POST https://your-project-name.vercel.app/api/wine/recommendations \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test-user","limit":3}'
```

## React Native Integration

### CORS Configuration

The API is configured with CORS headers to allow React Native app access:

```javascript
// Allowed origins: *
// Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
// Allowed headers: X-Requested-With, Content-Type, Authorization, Accept, Origin, User-Agent
```

### React Native Usage Example

```typescript
// In your React Native app
const API_BASE_URL = 'https://your-project-name.vercel.app/api';

// Wine label recognition
const recognizeWineLabel = async (imageBase64: string) => {
  const response = await fetch(`${API_BASE_URL}/ai/label-recognition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Optional: Include API key if configured
      // 'Authorization': 'Bearer your-api-secret-key'
    },
    body: JSON.stringify({ image: imageBase64 })
  });
  
  return await response.json();
};

// Voice transcription
const transcribeVoice = async (audioBase64: string) => {
  const response = await fetch(`${API_BASE_URL}/ai/voice-transcription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audio: audioBase64, language: 'en' })
  });
  
  return await response.json();
};

// Wine search
const searchWines = async (query: string) => {
  const response = await fetch(`${API_BASE_URL}/wine/search?query=${encodeURIComponent(query)}&limit=10`);
  return await response.json();
};

// Wine recommendations
const getWineRecommendations = async (userId: string) => {
  const response = await fetch(`${API_BASE_URL}/wine/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: userId, limit: 10 })
  });
  
  return await response.json();
};
```

## Monitoring and Troubleshooting

### 1. View Deployment Logs

```bash
vercel logs https://your-project-name.vercel.app
```

### 2. Real-time Function Logs

```bash
vercel logs https://your-project-name.vercel.app --follow
```

### 3. Common Issues

**Issue**: "Supabase environment variables not configured"
**Solution**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in Vercel environment variables

**Issue**: "Google Vision API key not configured"
**Solution**: Add `GOOGLE_VISION_API_KEY` environment variable with valid Google Cloud API key

**Issue**: "OpenAI API key not configured"
**Solution**: Add `OPENAI_API_KEY` environment variable with valid OpenAI API key

**Issue**: CORS errors in React Native
**Solution**: Verify the API is deployed and CORS headers are properly configured in `vercel.json`

### 4. Performance Monitoring

Monitor your API usage in the Vercel dashboard:
- Function invocations
- Response times
- Error rates
- Bandwidth usage

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **API Secret**: Consider setting `API_SECRET_KEY` for additional security
3. **Rate Limiting**: Monitor usage and implement rate limiting if needed
4. **HTTPS Only**: Vercel automatically provides HTTPS for all deployments

## Scaling and Limits

### Vercel Free Tier Limits:
- 100GB bandwidth per month
- 100 serverless function invocations per day
- 10 second maximum execution time
- 50MB maximum payload size

### Upgrading:
For production use with higher traffic, consider upgrading to Vercel Pro for:
- Unlimited bandwidth
- Unlimited function invocations
- Extended execution time
- Enhanced performance

## Updates and Redeployment

To update your API:

```bash
# Make changes to your code
# Commit changes to git (optional but recommended)
git add .
git commit -m "Update API endpoints"

# Redeploy
vercel --prod
```

## Support

For deployment issues:
1. Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
2. View function logs for debugging
3. Test individual endpoints to isolate issues
4. Verify environment variables are correctly set

## API Documentation

For detailed API documentation, visit your deployed health endpoint:
`https://your-project-name.vercel.app/api/health`

This provides real-time status of all configured services and API availability.