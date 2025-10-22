import { nanoid } from 'nanoid';
import { 
  getMailboxByEmail, 
  updateMailbox, 
  createJobLog, 
  updateJobLog 
} from '../../db';
import { getGmailClient, getHistory, getMessage } from '../../services/gmail';
import { parseGmailMessage } from '../../utils/emailParser';
import { aiQueue } from '../queue';

export interface EmailNotificationData {
  emailAddress: string;
  historyId: string;
  receivedAt: Date;
}

/**
 * Process Gmail push notification
 */
export async function processEmailNotification(data: EmailNotificationData): Promise<void> {
  const jobLogId = nanoid();
  
  try {
    await createJobLog({
      id: jobLogId,
      jobType: 'email-notification',
      status: 'processing',
      payload: JSON.stringify(data),
    });

    // Find mailbox in database
    const mailbox = await getMailboxByEmail(data.emailAddress);
    if (!mailbox) {
      throw new Error(`Mailbox not found: ${data.emailAddress}`);
    }

    if (!mailbox.oauthAccessToken || !mailbox.oauthRefreshToken) {
      throw new Error(`Mailbox missing OAuth tokens: ${data.emailAddress}`);
    }

    // Get Gmail client
    const gmail = await getGmailClient(
      mailbox.oauthAccessToken,
      mailbox.oauthRefreshToken
    );

    // Fetch history changes
    const history = await getHistory(gmail, mailbox.gmailHistoryId || data.historyId);

    // Process each new message
    for (const historyItem of history) {
      if (historyItem.messagesAdded) {
        for (const messageAdded of historyItem.messagesAdded) {
          const message = messageAdded.message;
          
          // Skip if not in INBOX
          if (!message.labelIds?.includes('INBOX')) {
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
        }
      }
    }

    // Update mailbox history ID
    await updateMailbox(mailbox.id, {
      gmailHistoryId: data.historyId,
      lastSyncAt: new Date(),
    });

    await updateJobLog(jobLogId, {
      status: 'completed',
      completedAt: new Date(),
    });
  } catch (error: any) {
    console.error('[EmailProcessor] Error:', error);
    await updateJobLog(jobLogId, {
      status: 'failed',
      error: error.message,
      completedAt: new Date(),
    });
    throw error;
  }
}

