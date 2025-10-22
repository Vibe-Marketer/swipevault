import { Router } from 'express';
import { google } from 'googleapis';
import { createSession, setSessionCookie, clearSessionCookie, getSessionFromRequest } from '../auth';
import { upsertUser } from '../db';
import { nanoid } from 'nanoid';

const router = Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get Google OAuth URL
router.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
    prompt: 'consent',
  });
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
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    if (!data.email) {
      return res.status(400).send('Could not get user email');
    }

    // Create or update user in database
    const userId = nanoid();
    await upsertUser({
      id: userId,
      email: data.email,
      name: data.name || null,
      loginMethod: 'google',
      lastSignedIn: new Date(),
    });

    // Create session
    const sessionToken = createSession({
      id: userId,
      email: data.email,
      name: data.name || '',
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
  const user = getSessionFromRequest(req);
  res.json(user);
});

export default router;

