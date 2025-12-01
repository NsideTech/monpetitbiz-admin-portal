import { NextRequest, NextResponse } from 'next/server';
import { getMonPetitBizDatabase } from '@/lib/monpetitbiz-db';
import { requireAdmin } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const db = getMonPetitBizDatabase();
    
    const [
      totalBusinesses,
      totalTransactions,
      totalSales,
      totalExpenses,
      activeUsers,
    ] = await Promise.all([
      db.getTotalBusinesses(),
      db.getTotalTransactions(),
      db.getTotalSales(),
      db.getTotalExpenses(),
      db.getActiveUsersCount(),
    ]);

    const profit = totalSales - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        totalBusinesses,
        totalTransactions,
        totalSales,
        totalExpenses,
        profit,
        activeUsers,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

