import { QdrantClient } from '@qdrant/qdrant-js';
import { config } from '../config';

let qdrantClient: QdrantClient | null = null;

/**
 * Get or create Qdrant client singleton
 */
export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
    });
    console.log('[Qdrant] Client initialized');
  }

  return qdrantClient;
}

/**
 * Initialize Qdrant collection for email swipes
 */
export async function initQdrantCollection(): Promise<void> {
  const client = getQdrantClient();
  const collectionName = config.qdrant.collectionName;

  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);

    if (!exists) {
      // Create collection with 1536 dimensions (OpenAI text-embedding-3-small)
      await client.createCollection(collectionName, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
      console.log(`[Qdrant] Created collection: ${collectionName}`);
    } else {
      console.log(`[Qdrant] Collection already exists: ${collectionName}`);
    }
  } catch (error) {
    console.error('[Qdrant] Error initializing collection:', error);
    throw error;
  }
}

/**
 * Store email embedding in Qdrant
 */
export async function storeEmbedding(
  id: string,
  vector: number[],
  payload: {
    swipeId: string;
    userId: string;
    subject: string;
    senderEmail: string;
    receivedDate: string;
  }
): Promise<void> {
  const client = getQdrantClient();
  
  await client.upsert(config.qdrant.collectionName, {
    points: [
      {
        id,
        vector,
        payload,
      },
    ],
  });
}

/**
 * Search for similar emails using vector similarity
 */
export async function searchSimilar(
  vector: number[],
  userId: string,
  limit: number = 10
): Promise<Array<{ id: string; score: number; payload: any }>> {
  const client = getQdrantClient();

  const results = await client.search(config.qdrant.collectionName, {
    vector,
    limit,
    filter: {
      must: [
        {
          key: 'userId',
          match: { value: userId },
        },
      ],
    },
  });

  return results.map(r => ({
    id: r.id as string,
    score: r.score,
    payload: r.payload,
  }));
}

/**
 * Delete embedding from Qdrant
 */
export async function deleteEmbedding(id: string): Promise<void> {
  const client = getQdrantClient();
  
  await client.delete(config.qdrant.collectionName, {
    points: [id],
  });
}

