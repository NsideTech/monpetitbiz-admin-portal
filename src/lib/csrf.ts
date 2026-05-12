/**
 * Utilitaires pour la validation CSRF (Cross-Site Request Forgery)
 * Protège contre les attaques où un site malveillant force un utilisateur
 * authentifié à effectuer des actions non désirées
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

/**
 * Valide le token CSRF pour une requête
 * 
 * @param request La requête Next.js
 * @returns true si le token est valide, false sinon
 * 
 * @example
 * if (!await validateCsrfToken(request)) {
 *   return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
 * }
 */
export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Les méthodes GET, HEAD, OPTIONS sont exemptées de validation CSRF
  // (elles ne doivent pas modifier l'état du serveur)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(request.method)) {
    return true;
  }

  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('csrf_token')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');

  // Les deux doivent être présents
  if (!csrfCookie || !csrfHeader) {
    return false;
  }

  // Les tokens doivent correspondre
  return csrfCookie === csrfHeader;
}

/**
 * Obtenir le token CSRF depuis les cookies
 * Utile pour l'afficher dans les templates ou le passer au client
 * 
 * @returns Le token CSRF ou null s'il n'existe pas
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('csrf_token')?.value || null;
}

/**
 * Vérifier si un token CSRF est requis pour une méthode HTTP
 * 
 * @param method La méthode HTTP
 * @returns true si CSRF est requis, false sinon
 */
export function isCsrfRequired(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  return !safeMethods.includes(method.toUpperCase());
}
