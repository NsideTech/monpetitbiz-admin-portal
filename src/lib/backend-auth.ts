/**
 * Gestion de l'authentification avec le backend MonPetitBiz
 * Utilise un token de service/admin partagé pour authentifier toutes les requêtes
 */

export function getBackendServiceToken(): string {
  const token = process.env.BACKEND_SERVICE_TOKEN;

  if (!token) {
    throw new Error(
      'BACKEND_SERVICE_TOKEN is not configured. Please set it in your environment variables.'
    );
  }

  return token;
}

/**
 * Vérifie que le token de service est configuré
 */
export function isBackendAuthConfigured(): boolean {
  return !!process.env.BACKEND_SERVICE_TOKEN;
}

