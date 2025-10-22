import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const COOKIE_NAME = 'swipevault_session';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export function createSession(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
}

export function verifySession(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function getSessionFromRequest(req: Request): SessionUser | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  return verifySession(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getSessionFromRequest(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  (req as any).user = user;
  next();
}

