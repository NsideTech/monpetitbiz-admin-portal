/**
 * Validation des variables d'environnement au démarrage
 * Permet de détecter rapidement les problèmes de configuration
 */

export function validateEnvironment() {
  const errors: string[] = [];

  // Vérifier JWT_SECRET (CRITIQUE pour la sécurité)
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long (current: ' + process.env.JWT_SECRET.length + ')');
  }

  // Vérifier BACKEND_SERVICE_TOKEN
  if (!process.env.BACKEND_SERVICE_TOKEN) {
    errors.push('BACKEND_SERVICE_TOKEN is not set');
  }

  // Vérifier NEXT_PUBLIC_API_URL
  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL is not set');
  }

  // Vérifier DATABASE_URL si Neon est utilisé
  const dbType = process.env.DATABASE_TYPE || 
    (process.env.NODE_ENV === 'production' ? 'neon' : 'sqlite');
  
  if (dbType === 'neon' && !process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required when DATABASE_TYPE=neon');
  }

  if (errors.length > 0) {
    throw new Error(
      `❌ Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
      'Please check your .env.local file and ensure all required variables are set.\n' +
      'See env.example for reference.'
    );
  }

  console.log('✅ Environment validation passed');
}
