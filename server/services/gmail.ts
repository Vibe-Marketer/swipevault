import { google, Auth } from 'googleapis';
import { config } from '../config';
import { encrypt, decrypt } from '../utils/encryption';

/**
 * Create OAuth2 client
 */
export function createOAuth2Client(): Auth.OAuth2Client {
  return new google.auth.OAuth2(
    config.gmail.clientId,
    config.gmail.clientSecret,
    config.gmail.redirectUri
  );
}

/**
 * Generate Gmail OAuth authorization URL
 */
export function getAuthUrl(): string {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: config.gmail.scopes,
    prompt: 'consent', // Force consent to get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}> {
  const oauth2Client = createOAuth2Client();
  
  const { tokens } = await oauth2Client.getToken(code);
  
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date || Date.now() + 3600000,
  };
}

/**
 * Get authenticated Gmail client
 */
export async function getGmailClient(
  accessToken: string,
  refreshToken: string
): Promise<any> {
  const oauth2Client = createOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: decrypt(accessToken),
    refresh_token: decrypt(refreshToken),
  });

  // Auto-refresh tokens
  oauth2Client.on('tokens', (tokens: any) => {
    if (tokens.refresh_token) {
      console.log('[Gmail] Got new refresh token');
    }
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

/**
 * Get user's email address from Gmail API
 */
export async function getUserEmail(gmail: any): Promise<string> {
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return profile.data.emailAddress;
}

/**
 * Setup Gmail watch for push notifications
 */
export async function setupWatch(gmail: any): Promise<{
  historyId: string;
  expiration: number;
}> {
  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: `projects/${config.pubsub.projectId}/topics/${config.pubsub.topicName}`,
      labelIds: ['INBOX'], // Only monitor inbox
      labelFilterBehavior: 'INCLUDE',
    },
  });

  return {
    historyId: response.data.historyId,
    expiration: parseInt(response.data.expiration),
  };
}

/**
 * Stop Gmail watch
 */
export async function stopWatch(gmail: any): Promise<void> {
  await gmail.users.stop({ userId: 'me' });
}

/**
 * Get email history since a specific history ID
 */
export async function getHistory(
  gmail: any,
  startHistoryId: string
): Promise<any[]> {
  try {
    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
    });

    return response.data.history || [];
  } catch (error: any) {
    if (error.code === 404) {
      // History ID is too old, need full sync
      return [];
    }
    throw error;
  }
}

/**
 * Get full email message
 */
export async function getMessage(gmail: any, messageId: string): Promise<any> {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

  return response.data;
}

/**
 * List recent messages
 */
export async function listMessages(
  gmail: any,
  maxResults: number = 50
): Promise<any[]> {
  const response = await gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    maxResults,
  });

  return response.data.messages || [];
}

