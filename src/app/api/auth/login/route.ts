import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '@/lib/db';
import { cookies } from 'next/headers';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';
import { logSecurityEvent } from '@/lib/security-logger';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    
    const userAgent = request.headers.get('user-agent') || undefined;

    // Rate limiting: 5 attempts per 15 minutes per IP+username
    const rateLimitKey = `login:${clientIp}:${username}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      logSecurityEvent({
        type: 'rate_limit_exceeded',
        username,
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString(),
        details: {
          attempts: 6, // Au moins 6 tentatives pour être bloqué
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please try again in 15 minutes.',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    const db = getDatabase();
    const user = await db.getUserByUsername(username);

    if (!user) {
      logSecurityEvent({
        type: 'login_failed',
        username,
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString(),
        details: { reason: 'user_not_found' },
      });

      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      logSecurityEvent({
        type: 'login_failed',
        username,
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString(),
        details: { reason: 'invalid_password' },
      });

      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Login successful - reset rate limit
    resetRateLimit(rateLimitKey);

    // Create a signed JWT session token
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const sessionToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        businessId: user.businessId,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log successful login
    logSecurityEvent({
      type: 'login_success',
      username: user.username,
      userId: user.id,
      ip: clientIp,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          businessId: user.businessId,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

