import { nanoid } from 'nanoid';
import {
  getMailboxById,
  updateMailbox,
  createJobLog,
  updateJobLog,
  getSwipesByUser,
} from '../../db';
import { getGmailClient, listMessages, getMessage } from '../../services/gmail';
import { parseGmailMessage } from '../../utils/emailParser';
import { aiQueue } from '../queue';

export interface SyncJobData {
  mailboxId: string;
  userId: string;
  maxResults?: number; // Number of emails to sync
}

/**
 * Process initial sync for a newly connected mailbox
 * Fetches the most recent emails and queues them for AI classification
 */
export async function processInitialSync(data: SyncJobData): Promise<void> {
  const jobLogId = nanoid();
  const maxResults = data.maxResults || 100; // Sync last 100 emails by default

  try {
    await createJobLog({
      id: jobLogId,
      jobType: 'initial-sync',
      status: 'processing',
      payload: JSON.stringify(data),
    });

    console.log(`[InitialSync] Starting initial sync for mailbox ${data.mailboxId}`);

    // Get mailbox from database
    const mailbox = await getMailboxById(data.mailboxId);
    if (!mailbox) {
      throw new Error(`Mailbox not found: ${data.mailboxId}`);
    }

    if (!mailbox.oauthAccessToken || !mailbox.oauthRefreshToken) {
      throw new Error(`Mailbox missing OAuth tokens: ${data.mailboxId}`);
    }

    if (mailbox.userId !== data.userId) {
      throw new Error(`Mailbox does not belong to user: ${data.mailboxId}`);
    }

    // Get Gmail client
    const gmail = await getGmailClient(
      mailbox.oauthAccessToken,
      mailbox.oauthRefreshToken
    );

    // List recent messages from INBOX
    console.log(`[InitialSync] Fetching last ${maxResults} messages from INBOX`);
    const messages = await listMessages(gmail, maxResults);

    if (!messages || messages.length === 0) {
      console.log('[InitialSync] No messages found in INBOX');
      await updateJobLog(jobLogId, {
        status: 'completed',
        completedAt: new Date(),
      });
      return;
    }

    console.log(`[InitialSync] Found ${messages.length} messages, processing...`);

    // Get existing swipes to avoid duplicates
    const existingSwipes = await getSwipesByUser(data.userId, 1000, 0);
    const existingMessageIds = new Set(
      existingSwipes.map((s: any) => s.gmailMessageId)
    );

    let processedCount = 0;
    let skippedCount = 0;

    // Process each message
    for (const message of messages) {
      try {
        // Skip if already processed
        if (existingMessageIds.has(message.id)) {
          skippedCount++;
          continue;
        }

        // Fetch full message
        const fullMessage = await getMessage(gmail, message.id);

        // Parse email
        const parsed = await parseGmailMessage(fullMessage);

        // Queue AI classification job
        await aiQueue.add('classify-email', {
          mailboxId: mailbox.id,
          userId: mailbox.userId,
          gmailMessageId: message.id,
          threadId: message.threadId,
          parsed,
        });

        processedCount++;
      } catch (error: any) {
        console.error(`[InitialSync] Error processing message ${message.id}:`, error.message);
        // Continue with next message
      }
    }

    console.log(
      `[InitialSync] Completed: ${processedCount} queued, ${skippedCount} skipped (duplicates)`
    );

    // Update last sync timestamp
    await updateMailbox(mailbox.id, {
      lastSyncAt: new Date(),
    });

    await updateJobLog(jobLogId, {
      status: 'completed',
      completedAt: new Date(),
    });
  } catch (error: any) {
    console.error('[InitialSync] Error:', error);
    await updateJobLog(jobLogId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
    throw error;
  }
}

/**
 * Process manual sync triggered by user
 * Similar to initial sync but can be used for refresh
 */
export async function processManualSync(data: SyncJobData): Promise<void> {
  const jobLogId = nanoid();
  const maxResults = data.maxResults || 50; // Sync last 50 emails by default for manual sync

  try {
    await createJobLog({
      id: jobLogId,
      jobType: 'manual-sync',
      status: 'processing',
      payload: JSON.stringify(data),
    });

    console.log(`[ManualSync] Starting manual sync for mailbox ${data.mailboxId}`);

    // Get mailbox from database
    const mailbox = await getMailboxById(data.mailboxId);
    if (!mailbox) {
      throw new Error(`Mailbox not found: ${data.mailboxId}`);
    }

    if (!mailbox.oauthAccessToken || !mailbox.oauthRefreshToken) {
      throw new Error(`Mailbox missing OAuth tokens: ${data.mailboxId}`);
    }

    if (mailbox.userId !== data.userId) {
      throw new Error(`Mailbox does not belong to user: ${data.mailboxId}`);
    }

    // Get Gmail client
    const gmail = await getGmailClient(
      mailbox.oauthAccessToken,
      mailbox.oauthRefreshToken
    );

    // List recent messages from INBOX
    console.log(`[ManualSync] Fetching last ${maxResults} messages from INBOX`);
    const messages = await listMessages(gmail, maxResults);

    if (!messages || messages.length === 0) {
      console.log('[ManualSync] No messages found in INBOX');
      await updateJobLog(jobLogId, {
        status: 'completed',
        completedAt: new Date(),
      });
      return;
    }

    console.log(`[ManualSync] Found ${messages.length} messages, processing...`);

    // Get existing swipes to avoid duplicates
    const existingSwipes = await getSwipesByUser(data.userId, 1000, 0);
    const existingMessageIds = new Set(
      existingSwipes.map((s: any) => s.gmailMessageId)
    );

    let processedCount = 0;
    let skippedCount = 0;

    // Process each message
    for (const message of messages) {
      try {
        // Skip if already processed
        if (existingMessageIds.has(message.id)) {
          skippedCount++;
          continue;
        }

        // Fetch full message
        const fullMessage = await getMessage(gmail, message.id);

        // Parse email
        const parsed = await parseGmailMessage(fullMessage);

        // Queue AI classification job
        await aiQueue.add('classify-email', {
          mailboxId: mailbox.id,
          userId: mailbox.userId,
          gmailMessageId: message.id,
          threadId: message.threadId,
          parsed,
        });

        processedCount++;
      } catch (error: any) {
        console.error(`[ManualSync] Error processing message ${message.id}:`, error.message);
        // Continue with next message
      }
    }

    console.log(
      `[ManualSync] Completed: ${processedCount} queued, ${skippedCount} skipped (duplicates)`
    );

    // Update last sync timestamp
    await updateMailbox(mailbox.id, {
      lastSyncAt: new Date(),
    });

    await updateJobLog(jobLogId, {
      status: 'completed',
      completedAt: new Date(),
    });
  } catch (error: any) {
    console.error('[ManualSync] Error:', error);
    await updateJobLog(jobLogId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
    throw error;
  }
}
