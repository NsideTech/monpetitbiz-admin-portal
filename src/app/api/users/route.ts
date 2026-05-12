import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { requireAdmin } from '@/lib/auth-helpers';
import { validateCsrfToken } from '@/lib/csrf';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || undefined;

    const db = getDatabase();
    const result = await db.listUsersPaginated(page, limit, search);

    // Remove passwords from response
    const usersWithoutPasswords = result.data.map(({ password, ...user }) => user);

    return NextResponse.json({
      success: true,
      data: usersWithoutPasswords,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('List users error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Validate CSRF token
    if (!await validateCsrfToken(request)) {
      return NextResponse.json(
        { success: false, message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    await requireAdmin();

    const body = await request.json();
    const { username, password, role, businessId } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Username, password, and role are required' },
        { status: 400 }
      );
    }

    const validRoles = ['admin', 'manager'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }

    const db = getDatabase();
    
    // Check if username already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 409 }
      );
    }

    const user = await db.createUser({
      username,
      password,
      role,
      businessId,
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

