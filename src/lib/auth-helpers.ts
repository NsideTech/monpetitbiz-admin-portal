import { cookies } from 'next/headers';
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

    const sessionData = JSON.parse(
      Buffer.from(sessionToken, 'base64').toString()
    ) as SessionUser;

    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      return null;
    }

    return sessionData;
  } catch (error) {
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

