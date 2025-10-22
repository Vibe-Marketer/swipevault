import { Router } from 'express';
import { getAuthUrl, exchangeCodeForTokens, getUserEmail } from '../services/gmail';
import { createSession, setSessionCookie, clearSessionCookie } from '../auth';
import { upsertUser, getUser } from '../db';
import { nanoid } from 'nanoid';

const router = Router();

// Get Google OAuth URL
router.get('/auth/google', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

// Handle Google OAuth callback
router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Exchange code for tokens
    const { accessToken, refreshToken } = await exchangeCodeForTokens(code);
    
    // Get user email from Google
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    if (!data.email) {
      return res.status(400).send('Could not get user email');
    }

    // Create or update user
    const userId = nanoid();
    await upsertUser({
      id: userId,
      email: data.email,
      name: data.name || null,
      loginMethod: 'google',
      lastSignedIn: new Date(),
    });

    // Get user from database
    let user = await getUser(userId);
    if (!user) {
      // If user doesn't exist, find by email
      const { getDb } = await import('../db');
      const { users } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const db = await getDb();
      if (db) {
        const result = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
        user = result[0];
      }
    }

    if (!user) {
      return res.status(500).send('Failed to create user');
    }

    // Create session
    const sessionToken = createSession({
      id: user.id,
      email: user.email!,
      name: user.name || '',
    });

    setSessionCookie(res, sessionToken);

    // Redirect to home
    res.redirect('/');
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// Get current user
router.get('/auth/me', (req, res) => {
  const { getSessionFromRequest } = require('../auth');
  const user = getSessionFromRequest(req);
  res.json(user);
});

export default router;

