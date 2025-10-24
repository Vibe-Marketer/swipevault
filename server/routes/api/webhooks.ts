import { Router, Request, Response } from 'express';
import { emailQueue } from '../../jobs/queue';

const router = Router();

/**
 * Gmail Pub/Sub webhook endpoint
 *
 * Receives push notifications from Gmail API via Google Cloud Pub/Sub.
 *
 * Message format:
 * {
 *   "message": {
 *     "data": "<base64-encoded-json>",
 *     "messageId": "...",
 *     "publishTime": "..."
 *   },
 *   "subscription": "..."
 * }
 *
 * Decoded data contains:
 * {
 *   "emailAddress": "user@gmail.com",
 *   "historyId": "12345"
 * }
 */
router.post('/gmail-pubsub', async (req: Request, res: Response) => {
  try {
    console.log('[Webhook] Received Gmail Pub/Sub notification');

    // Extract Pub/Sub message
    const pubsubMessage = req.body.message;

    if (!pubsubMessage || !pubsubMessage.data) {
      console.error('[Webhook] Invalid Pub/Sub message format');
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Decode base64 data
    const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
    const notification = JSON.parse(decodedData);

    const { emailAddress, historyId } = notification;

    if (!emailAddress || !historyId) {
      console.error('[Webhook] Missing emailAddress or historyId', notification);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Webhook] Processing notification for ${emailAddress}, historyId: ${historyId}`);

    // Queue job for background processing (if Redis is available)
    if (emailQueue) {
      await emailQueue.add('process-gmail-notification', {
        emailAddress,
        historyId,
        receivedAt: new Date(),
      });
      console.log(`[Webhook] Job queued for ${emailAddress}`);
    } else {
      console.warn('[Webhook] Redis not available, skipping job queue');
    }

    // Always return 200 OK to acknowledge receipt
    // Google Pub/Sub will retry if we don't respond with 200
    res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('[Webhook] Error processing Gmail notification:', error);

    // Still return 200 to prevent retries for malformed messages
    // The job queue will handle retries for processing errors
    res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Health check endpoint for webhook
 */
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

export default router;
