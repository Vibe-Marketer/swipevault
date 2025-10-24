import { Router } from 'express';
import { google } from 'googleapis';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createSession, setSessionCookie, clearSessionCookie, getSessionFromRequest } from '../../auth';
import { createUser, getUser, getUserByEmail, upsertUser } from '../../db';
import { hashPassword, verifyPassword } from '../../utils/password';
import { authLimiter } from '../../middleware/rateLimiter';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.post('/auth/register', authLimiter, async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parseResult.error.flatten(),
    });
  }

  const { email, password, name } = parseResult.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const existingUser = await getUserByEmail(normalizedEmail);
    if (existingUser) {
      if (existingUser.loginMethod && existingUser.loginMethod !== 'password') {
        return res.status(409).json({
          error: 'An account with this email already exists via OAuth. Please sign in with that provider.',
        });
      }

      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({
      id: nanoid(),
      email: normalizedEmail,
      name: name ?? null,
      passwordHash: hashedPassword,
      loginMethod: 'password',
      lastSignedIn: new Date(),
    });

    const sessionToken = createSession({
      id: user.id,
      email: user.email,
      name: user.name ?? '',
    });
    setSessionCookie(res, sessionToken);

    return res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      loginMethod: user.loginMethod,
    });
  } catch (error) {
    console.error('[Auth] Registration failed:', error);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

router.post('/auth/login', authLimiter, async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid input',
      details: parseResult.error.flatten(),
    });
  }

  const { email, password } = parseResult.data;
  const normalizedEmail = email.toLowerCase();

  try {
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.loginMethod && user.loginMethod !== 'password') {
      return res.status(400).json({
        error: 'This account uses OAuth login. Please sign in with the connected provider.',
      });
    }

    const passwordValid = await verifyPassword(password, user.passwordHash ?? null);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await upsertUser({
      id: user.id,
      email: user.email,
      lastSignedIn: new Date(),
    });

    const sessionToken = createSession({
      id: user.id,
      email: user.email,
      name: user.name ?? '',
    });
    setSessionCookie(res, sessionToken);

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      loginMethod: user.loginMethod,
    });
  } catch (error) {
    console.error('[Auth] Login failed:', error);
    return res.status(500).json({ error: 'Unable to login.' });
  }
});

// Get Google OAuth URL
router.get('/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'online',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
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
    console.log('[OAuth] Exchanging code for tokens...');
    console.log('[OAuth] Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
    console.log('[OAuth] Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[OAuth] Token exchange successful');
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    
    if (!data.email) {
      return res.status(400).send('Could not get user email');
    }

    const normalizedEmail = data.email.toLowerCase();
    const existingUser = await getUserByEmail(normalizedEmail);
    const userId = existingUser?.id ?? nanoid();

    await upsertUser({
      id: userId,
      email: normalizedEmail,
      name: data.name || null,
      loginMethod: 'google',
      lastSignedIn: new Date(),
    });

    // Create session
    const sessionToken = createSession({
      id: userId,
      email: normalizedEmail,
      name: data.name || '',
    });

    setSessionCookie(res, sessionToken);

    // Redirect to home
    res.redirect('/');
  } catch (error) {
    console.error('[OAuth] Callback error:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { status?: number; data?: unknown } }).response;
      if (response) {
        console.error('[OAuth] Response status:', response.status);
        console.error('[OAuth] Response data:', JSON.stringify(response.data, null, 2));
      }
    }
    if (error instanceof Error) {
      console.error('[OAuth] Error message:', error.message);
      console.error('[OAuth] Error stack:', error.stack);
      res.status(500).send(`Authentication failed: ${error.message}`);
    } else {
      res.status(500).send('Authentication failed');
    }
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

// Get current user
router.get('/auth/me', async (req, res) => {
  const sessionUser = getSessionFromRequest(req);
  if (!sessionUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await getUser(sessionUser.id);

    if (!user) {
      clearSessionCookie(res);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      loginMethod: user.loginMethod,
    });
  } catch (error) {
    console.error('[Auth] Failed to load current user:', error);
    return res.status(500).json({ error: 'Unable to load user profile.' });
  }
});

export default router;

