import { invokeLLM } from '../_core/llm';
import { config } from '../config';
import { getTags } from '../db';

export interface EmailClassification {
  useCases: Array<{ name: string; confidence: number }>;
  niches: Array<{ name: string; confidence: number }>;
  techniques: Array<{ name: string; confidence: number }>;
  purposes: Array<{ name: string; confidence: number }>;
  senderTypes: Array<{ name: string; confidence: number }>;
}

export interface EmailInsights {
  summary: string;
  keyTakeaways: string[];
  ctaAnalysis: string;
  headlineQuality: string;
}

/**
 * Classify email using AI
 */
export async function classifyEmail(
  subject: string,
  body: string,
  senderEmail: string
): Promise<{ classification: EmailClassification; insights: EmailInsights }> {
  // Get all tags from database
  const allTags = await getTags();
  
  const useCaseTags = allTags.filter(t => t.category === 'use_case').map(t => t.name);
  const nicheTags = allTags.filter(t => t.category === 'niche').map(t => t.name);
  const techniqueTags = allTags.filter(t => t.category === 'technique').map(t => t.name);
  const purposeTags = allTags.filter(t => t.category === 'purpose').map(t => t.name);
  const senderTypeTags = allTags.filter(t => t.category === 'sender_type').map(t => t.name);

  const prompt = `You are an expert email marketing analyst. Analyze the following email and classify it.

EMAIL CONTENT:
Subject: ${subject}
From: ${senderEmail}
Body: ${body.substring(0, 3000)}

CLASSIFICATION CATEGORIES:

1. USE CASE (select all that apply with confidence 0-100):
${useCaseTags.join(', ')}

2. NICHE/INDUSTRY (select primary with confidence 0-100):
${nicheTags.join(', ')}

3. COPYWRITING TECHNIQUES (select all that apply with confidence 0-100):
${techniqueTags.join(', ')}

4. PRIMARY PURPOSE (select one with confidence 0-100):
${purposeTags.join(', ')}

5. SENDER TYPE (select one with confidence 0-100):
${senderTypeTags.join(', ')}

Return your analysis in the following JSON format:
{
  "classification": {
    "useCases": [{"name": "Promotional/Sales", "confidence": 95}],
    "niches": [{"name": "E-commerce/Retail", "confidence": 90}],
    "techniques": [{"name": "Urgency/Scarcity", "confidence": 85}, {"name": "Social Proof", "confidence": 70}],
    "purposes": [{"name": "Sales/Conversion", "confidence": 95}],
    "senderTypes": [{"name": "E-commerce Brand", "confidence": 90}]
  },
  "insights": {
    "summary": "Brief 2-3 sentence summary of the email's approach",
    "keyTakeaways": ["Takeaway 1", "Takeaway 2", "Takeaway 3"],
    "ctaAnalysis": "Analysis of the call-to-action effectiveness",
    "headlineQuality": "Assessment of subject line quality"
  }
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: 'system', content: 'You are an expert email marketing analyst. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'email_classification',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              classification: {
                type: 'object',
                properties: {
                  useCases: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                      required: ['name', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                  niches: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                      required: ['name', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                  techniques: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                      required: ['name', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                  purposes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                      required: ['name', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                  senderTypes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        confidence: { type: 'number' },
                      },
                      required: ['name', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['useCases', 'niches', 'techniques', 'purposes', 'senderTypes'],
                additionalProperties: false,
              },
              insights: {
                type: 'object',
                properties: {
                  summary: { type: 'string' },
                  keyTakeaways: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  ctaAnalysis: { type: 'string' },
                  headlineQuality: { type: 'string' },
                },
                required: ['summary', 'keyTakeaways', 'ctaAnalysis', 'headlineQuality'],
                additionalProperties: false,
              },
            },
            required: ['classification', 'insights'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('No response from AI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('[AI] Classification error:', error);
    throw error;
  }
}

/**
 * Generate embeddings for email content
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use built-in Manus OpenAI API for embeddings
    const response = await fetch(`${config.openai.baseURL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.openai.embeddingModel,
        input: text.substring(0, 8000), // Limit input length
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('[AI] Embedding generation error:', error);
    throw error;
  }
}

