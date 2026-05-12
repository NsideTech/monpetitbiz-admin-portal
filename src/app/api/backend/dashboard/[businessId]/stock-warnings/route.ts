import { NextRequest, NextResponse } from 'next/server';
import { getBackendServiceToken } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth-helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    await requireAuth();

    const { businessId  } = await params;
    const token = getBackendServiceToken();
    const { searchParams } = new URL(request.url);
    const threshold = searchParams.get('threshold') || '5';

    const response = await fetch(
      `${BACKEND_URL}/admin/dashboard/${businessId}/stock-warnings?threshold=${threshold}`,
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
    console.error('Dashboard stock-warnings proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

