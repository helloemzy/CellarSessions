// Quick test script for AI services
import { GoogleVisionService } from './src/services/api/googleVision.js';
import { OpenAIService } from './src/services/api/openai.js';

async function testGoogleVision() {
  console.log('🔍 Testing Google Vision API...');
  try {
    // Test with a sample image URL (you can replace with your own)
    const result = await GoogleVisionService.extractTextFromImage('https://example.com/wine-label.jpg');
    console.log('✅ Google Vision API is working:', result.data ? 'Success' : 'No data returned');
  } catch (error) {
    console.log('❌ Google Vision API error:', error.message);
  }
}

async function testOpenAI() {
  console.log('🤖 Testing OpenAI API...');
  try {
    // Test with a sample wine analysis
    const result = await OpenAIService.analyzeWineTastingNotes(
      'This wine has a deep ruby color with aromas of blackberry and vanilla. The palate shows ripe fruit with smooth tannins.',
      { name: 'Test Wine', wineType: 'red' }
    );
    console.log('✅ OpenAI API is working:', result.result ? 'Success' : 'No result returned');
  } catch (error) {
    console.log('❌ OpenAI API error:', error.message);
  }
}

// Run tests
console.log('🧪 Starting AI Service Tests...\n');
testGoogleVision();
testOpenAI();
console.log('\n✨ Test complete! Check the results above.');