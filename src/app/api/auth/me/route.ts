import { NextResponse } from 'next/server';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const user = await getUserFromSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

