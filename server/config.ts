import { ENV } from './_core/env';

/**
 * Configuration for external services (Elestio-hosted infrastructure)
 */
export const config = {
  // Redis configuration (Elestio)
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  },

  // Qdrant vector database configuration (Elestio)
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: 'email_swipes',
  },

  // Gmail API configuration
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/mailboxes/oauth/callback`,
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata',
    ],
  },

  // Google Cloud Pub/Sub configuration
  pubsub: {
    projectId: process.env.GOOGLE_PUBSUB_PROJECT_ID || '',
    topicName: process.env.GOOGLE_PUBSUB_TOPIC || 'gmail-notifications',
    subscriptionName: process.env.GOOGLE_PUBSUB_SUBSCRIPTION || 'gmail-sub',
  },

  // OpenAI configuration (using built-in Forge API)
  openai: {
    apiKey: ENV.forgeApiKey, // Use built-in Manus API
    baseURL: ENV.forgeApiUrl,
    model: 'gpt-4o-mini', // Cost-efficient model
    embeddingModel: 'text-embedding-3-small',
  },

  // Encryption configuration
  encryption: {
    algorithm: 'aes-256-gcm',
    key: process.env.ENCRYPTION_KEY || ENV.cookieSecret, // Fallback to cookie secret
  },

  // Job queue configuration
  queue: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential' as const,
        delay: 2000,
      },
    },
  },
};

