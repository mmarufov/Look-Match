import { GoogleGenerativeAI } from '@google/generative-ai';
import { VisionAttributes } from '../../shared/types';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export async function generateProductDescription(
  attributes: VisionAttributes,
  visionLabels: string[]
): Promise<string | null> {
  const client = getGeminiClient();
  
  if (!client) {
    console.warn('Gemini API key not configured');
    return null;
  }

  try {
    const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are a professional fashion copywriter creating descriptions for a clothing matching app. Users upload photos to find similar items to buy.

Garment Details:
- Category: ${attributes.category}
- Colors: ${attributes.colors.join(', ')}
- Material: ${attributes.material || 'not specified'}
- Brand: ${attributes.brandHints[0] || 'not specified'}
- Gender: ${attributes.gender || 'unisex'}
- Pattern: ${attributes.pattern || 'not specified'}
- AI Labels: ${visionLabels.join(', ')}

Write a compelling 2-3 sentence description that:
- Sounds like a personal stylist recommendation
- Highlights key style elements and versatility
- Mentions how it can be styled or worn
- Appeals to someone shopping for similar items
- Uses fashion-forward but accessible language
${attributes.brandHints[0] ? `- Subtly reflects ${attributes.brandHints[0]}'s brand identity` : ''}

Generate only the description text, no extra formatting:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    return text.trim();
    
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

