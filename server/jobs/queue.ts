import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../services/redis';
import { config } from '../config';
import { processEmailNotification } from './processors/emailProcessor';
import { processAIClassification } from './processors/aiProcessor';

// Skip queue initialization in development without Redis
const redisAvailable = !!(process.env.REDIS_HOST || process.env.NODE_ENV === 'production');

console.log('[Queue] Redis available:', redisAvailable);

// Job queue for Gmail notifications
export const emailQueue = redisAvailable ? new Queue('email-notifications', {
  connection: getRedisClient(),
  defaultJobOptions: config.queue.defaultJobOptions,
}) : null as any;

// Job queue for AI classification
export const aiQueue = redisAvailable ? new Queue('ai-classification', {
  connection: getRedisClient(),
  defaultJobOptions: config.queue.defaultJobOptions,
}) : null as any;

// Worker for email notifications
export const emailWorker = redisAvailable ? new Worker(
  'email-notifications',
  async (job: Job) => {
    console.log(`[EmailWorker] Processing job ${job.id}`);
    await processEmailNotification(job.data);
  },
  {
    connection: getRedisClient(),
    concurrency: 5, // Process 5 jobs concurrently
  }
) : null as any;

// Worker for AI classification
export const aiWorker = redisAvailable ? new Worker(
  'ai-classification',
  async (job: Job) => {
    console.log(`[AIWorker] Processing job ${job.id}`);
    await processAIClassification(job.data);
  },
  {
    connection: getRedisClient(),
    concurrency: 3, // Process 3 AI jobs concurrently
  }
) : null as any;

// Event handlers (only if workers exist)
if (redisAvailable) {
  emailWorker?.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed`);
  });

  emailWorker?.on('failed', (job, err) => {
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err);
  });

  aiWorker?.on('completed', (job) => {
    console.log(`[AIWorker] Job ${job.id} completed`);
  });

  aiWorker?.on('failed', (job, err) => {
    console.error(`[AIWorker] Job ${job?.id} failed:`, err);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[Queue] Shutting down workers...');
    await emailWorker?.close();
    await aiWorker?.close();
    process.exit(0);
  });
}

