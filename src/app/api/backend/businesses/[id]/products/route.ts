import { NextRequest, NextResponse } from 'next/server';
import { getBackendServiceToken } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth-helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: businessId  } = await params;
    const token = getBackendServiceToken();

    const url = `${BACKEND_URL}/admin/businesses/${businessId}/products`;
    console.log(`[Products API] Fetching products from: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error (${response.status}):`, errorText);
      console.error(`Request URL: ${BACKEND_URL}/admin/businesses/${businessId}/products`);
      
      let errorMessage = 'Unknown error';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: response.status === 404
            ? errorMessage || 'Business not found'
            : response.status === 401 
            ? 'Backend authentication failed' 
            : response.status === 403
            ? 'Access denied'
            : errorMessage || `Backend error: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id: businessId  } = await params;
    const body = await request.json();
    const token = getBackendServiceToken();

    const response = await fetch(
      `${BACKEND_URL}/admin/businesses/${businessId}/products`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error (${response.status}):`, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          message: response.status === 404
            ? 'Business not found'
            : response.status === 400
            ? JSON.parse(errorText).message || 'Invalid request'
            : response.status === 401 
            ? 'Backend authentication failed' 
            : response.status === 403
            ? 'Access denied'
            : `Backend error: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

