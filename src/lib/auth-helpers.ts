import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getDatabase } from './db';

export interface SessionUser {
  userId: string;
  username: string;
  role: string;
  businessId?: string;
  expiresAt: number;
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return null;
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return null;
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(
      sessionToken,
      process.env.JWT_SECRET
    ) as {
      userId: string;
      username: string;
      role: string;
      businessId?: string;
      iat: number;
      exp: number;
    };

    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      businessId: decoded.businessId,
      expiresAt: decoded.exp * 1000, // Convert to milliseconds
    };
  } catch (error) {
    // JWT verification failed (invalid signature, expired, malformed)
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid JWT token:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn('Expired JWT token');
    } else {
      console.error('Session validation error:', error);
    }
    return null;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireAuth();
  if (session.role !== 'admin') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

export async function getUserFromSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const db = getDatabase();
  const user = await db.getUserById(session.userId);
  
  if (!user) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

