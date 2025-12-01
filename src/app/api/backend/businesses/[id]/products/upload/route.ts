import { NextRequest, NextResponse } from 'next/server';
import { getBackendServiceToken } from '@/lib/backend-auth';
import { requireAuth } from '@/lib/auth-helpers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000';

interface ProductInput {
  name: string;
  quantity: number;
  unitPrice?: number;
}

function parseCSV(csvText: string): ProductInput[] {
  const lines = csvText.trim().split('\n');
  const products: ProductInput[] = [];
  const errors: string[] = [];

  // Skip header line if it looks like headers (contains "nom", "quantité", "prix" or similar)
  let startIndex = 0;
  const firstLine = lines[0]?.toLowerCase() || '';
  if (firstLine.includes('nom') || firstLine.includes('name') || 
      firstLine.includes('quantité') || firstLine.includes('quantity') ||
      firstLine.includes('prix') || firstLine.includes('price')) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const parts = line.split(',').map(p => p.trim());
    
    if (parts.length < 2) {
      errors.push(`Ligne ${i + 1}: Format invalide (attendu: nom,quantité,prix)`);
      continue;
    }

    const name = parts[0];
    const quantityStr = parts[1];
    const priceStr = parts[2] || '';

    // Validate name
    if (!name || name.length === 0) {
      errors.push(`Ligne ${i + 1}: Le nom du produit est requis`);
      continue;
    }

    // Validate quantity
    const quantity = parseFloat(quantityStr);
    if (isNaN(quantity) || quantity < 0) {
      errors.push(`Ligne ${i + 1}: La quantité doit être un nombre valide (>= 0)`);
      continue;
    }

    // Parse price (optional)
    let unitPrice: number | undefined;
    if (priceStr && priceStr.trim().length > 0) {
      const parsedPrice = parseFloat(priceStr);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        errors.push(`Ligne ${i + 1}: Le prix doit être un nombre valide (>= 0)`);
        continue;
      }
      unitPrice = parsedPrice;
    }

    products.push({
      name,
      quantity: Math.floor(quantity), // Ensure integer quantity
      unitPrice,
    });
  }

  return products;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const { id: businessId } = params;

    // Get the CSV file from FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Aucun fichier fourni' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { success: false, message: 'Le fichier doit être un CSV (.csv)' },
        { status: 400 }
      );
    }

    // Read and parse CSV
    const csvText = await file.text();
    const products = parseCSV(csvText);

    if (products.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Aucun produit valide trouvé dans le fichier CSV' },
        { status: 400 }
      );
    }

    // Send to backend
    const token = getBackendServiceToken();
    const response = await fetch(
      `${BACKEND_URL}/admin/businesses/${businessId}/products/bulk-create`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products }),
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
    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('Upload products CSV error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

