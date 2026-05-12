import { NextRequest, NextResponse } from 'next/server';
import { getBackendServiceToken } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth-helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    await requireAuth();
    const { id: businessId, productId  } = await params;
    const body = await request.json();
    const token = getBackendServiceToken();

    const response = await fetch(
      `${BACKEND_URL}/admin/businesses/${businessId}/products/${productId}`,
      {
        method: 'PATCH',
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
            ? 'Product or business not found'
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
    console.error('Update product error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    await requireAuth();
    const { id: businessId, productId  } = await params;
    const token = getBackendServiceToken();

    const response = await fetch(
      `${BACKEND_URL}/admin/businesses/${businessId}/products/${productId}`,
      {
        method: 'DELETE',
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
          message: response.status === 404
            ? 'Product or business not found'
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
    console.error('Delete product error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

