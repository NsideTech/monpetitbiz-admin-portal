import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Proxy Next.js pour la protection CSRF
 * Génère un token CSRF pour chaque session et le stocke dans un cookie
 */
export default function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Générer un token CSRF s'il n'existe pas
  if (!request.cookies.get('csrf_token')) {
    const csrfToken = randomHex(32);
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Le client doit pouvoir le lire pour l'envoyer dans les headers
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 heures
      path: '/',
    });
  }

  return response;
}

// Appliquer le middleware sur toutes les routes sauf les fichiers statiques
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
