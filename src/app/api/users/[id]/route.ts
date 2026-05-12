import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { requireAdmin, requireAuth } from '@/lib/auth-helpers';
import { validateCsrfToken } from '@/lib/csrf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id  } = await params;

    // Users can view their own profile, admins can view any
    if (session.userId !== id && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const db = getDatabase();
    const user = await db.getUserById(id);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate CSRF token
    if (!await validateCsrfToken(request)) {
      return NextResponse.json(
        { success: false, message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    const session = await requireAuth();
    const { id  } = await params;

    // Users can update their own profile (limited fields), admins can update any
    if (session.userId !== id && session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, role, businessId } = body;

    const db = getDatabase();
    const existingUser = await db.getUserById(id);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Non-admins can only update their password, not role or username
    const updateData: any = {};
    if (session.role === 'admin') {
      if (username !== undefined) updateData.username = username;
      if (role !== undefined) {
        const validRoles = ['admin', 'manager'];
        if (!validRoles.includes(role)) {
          return NextResponse.json(
            { success: false, message: 'Invalid role' },
            { status: 400 }
          );
        }
        updateData.role = role;
      }
      if (businessId !== undefined) updateData.businessId = businessId;
    }
    if (password !== undefined) updateData.password = password;

    // Check if username already exists (if changing username)
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await db.getUserByUsername(updateData.username);
      if (usernameExists) {
        return NextResponse.json(
          { success: false, message: 'Username already exists' },
          { status: 409 }
        );
      }
    }

    const user = await db.updateUser(id, updateData);
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate CSRF token
    if (!await validateCsrfToken(request)) {
      return NextResponse.json(
        { success: false, message: 'Invalid CSRF token' },
        { status: 403 }
      );
    }

    await requireAdmin();

    const { id  } = await params;
    const db = getDatabase();

    await db.deleteUser(id);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    if (error.message === 'User not found') {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }

    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

