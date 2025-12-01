import { NextRequest, NextResponse } from 'next/server';
import { getBackendServiceToken } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth-helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

export async function GET(request: NextRequest) {
  try {
    // Vérifier que l'utilisateur est authentifié (admin du portail)
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';

    const token = getBackendServiceToken();

    // Construire l'URL avec les query params
    const url = new URL(`${BACKEND_URL}/admin/businesses`);
    url.searchParams.set('page', page);
    url.searchParams.set('limit', limit);
    if (search) {
      url.searchParams.set('search', search);
    }

    // Faire la requête vers le backend
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error (${response.status}):`, errorText);
      
      return NextResponse.json(
        { 
          success: false, 
          message: response.status === 401 
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
    console.error('Businesses proxy error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

