import { NextRequest, NextResponse } from 'next/server';
import { getBackendServiceToken } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth-helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export async function GET(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    await requireAuth();

    const { businessId } = params;
    const token = getBackendServiceToken();
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '10';

    const response = await fetch(
      `${BACKEND_URL}/admin/dashboard/${businessId}/recent-transactions?limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error (${response.status}):`, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          message: response.status === 401 
            ? 'Backend authentication failed' 
            : `Backend error: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Dashboard recent-transactions proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

