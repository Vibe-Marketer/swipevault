import { nanoid } from 'nanoid';
import { 
  createSwipe, 
  createJobLog, 
  updateJobLog,
  getTagByName,
  addSwipeTag,
} from '../../db';
import { classifyEmail, generateEmbedding } from '../../services/ai';
import { storeEmbedding } from '../../services/qdrant';
import { extractTextForAI, cleanHtml, ParsedEmail } from '../../utils/emailParser';

export interface AIClassificationData {
  mailboxId: string;
  userId: string;
  gmailMessageId: string;
  threadId: string;
  parsed: ParsedEmail;
}

/**
 * Process AI classification for an email
 */
export async function processAIClassification(data: AIClassificationData): Promise<void> {
  const jobLogId = nanoid();
  
  try {
    await createJobLog({
      id: jobLogId,
      jobType: 'ai-classification',
      status: 'processing',
      payload: JSON.stringify({ gmailMessageId: data.gmailMessageId }),
    });

    const { parsed } = data;

    // Extract text for AI analysis
    const textForAI = extractTextForAI(parsed);

    // Classify email with AI
    const { classification, insights } = await classifyEmail(
      parsed.subject,
      textForAI,
      parsed.from.email
    );

    // Generate embedding
    const embedding = await generateEmbedding(textForAI);

    // Create swipe record
    const swipeId = nanoid();
    const embeddingId = nanoid();

    await createSwipe({
      id: swipeId,
      userId: data.userId,
      mailboxId: data.mailboxId,
      gmailMessageId: data.gmailMessageId,
      threadId: data.threadId,
      subject: parsed.subject,
      senderEmail: parsed.from.email,
      senderName: parsed.from.name,
      recipientEmail: parsed.to,
      receivedDate: parsed.date,
      htmlBody: cleanHtml(parsed.htmlBody),
      plainBody: parsed.plainBody,
      snippet: parsed.snippet,
      isHtml: !!parsed.htmlBody,
      hasImages: parsed.hasImages,
      aiClassification: JSON.stringify(classification),
      aiInsights: JSON.stringify(insights),
      embeddingVectorId: embeddingId,
      isFavorite: false,
      notes: null,
      manualTags: null,
    });

    // Store embedding in Qdrant
    await storeEmbedding(embeddingId, embedding, {
      swipeId,
      userId: data.userId,
      subject: parsed.subject,
      senderEmail: parsed.from.email,
      receivedDate: parsed.date.toISOString(),
    });

    // Add AI-generated tags
    const allTags = [
      ...classification.useCases,
      ...classification.niches,
      ...classification.techniques,
      ...classification.purposes,
      ...classification.senderTypes,
    ];

    for (const tag of allTags) {
      // Find tag in database by name (need to determine category)
      let category = '';
      if (classification.useCases.find(t => t.name === tag.name)) category = 'use_case';
      else if (classification.niches.find(t => t.name === tag.name)) category = 'niche';
      else if (classification.techniques.find(t => t.name === tag.name)) category = 'technique';
      else if (classification.purposes.find(t => t.name === tag.name)) category = 'purpose';
      else if (classification.senderTypes.find(t => t.name === tag.name)) category = 'sender_type';

      if (!category) continue;

      const dbTag = await getTagByName(category, tag.name);
      if (dbTag) {
        await addSwipeTag({
          swipeId,
          tagId: dbTag.id,
          confidenceScore: Math.round(tag.confidence),
          isAiGenerated: true,
        });
      }
    }

    await updateJobLog(jobLogId, {
      status: 'completed',
      completedAt: new Date(),
    });

    console.log(`[AIProcessor] Classified email: ${parsed.subject}`);
  } catch (error: any) {
    console.error('[AIProcessor] Error:', error);
    await updateJobLog(jobLogId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
    throw error;
  }
}

