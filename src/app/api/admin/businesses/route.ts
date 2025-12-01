import { NextRequest, NextResponse } from 'next/server';
import { getMonPetitBizDatabase } from '@/lib/monpetitbiz-db';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const db = getMonPetitBizDatabase();
    const businesses = await db.getAllBusinessesWithStats();

    return NextResponse.json({
      success: true,
      data: businesses,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Get businesses error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

