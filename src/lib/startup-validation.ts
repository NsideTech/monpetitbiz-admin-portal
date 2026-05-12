/**
 * Validation au démarrage de l'application
 * Exécuté une seule fois côté serveur
 */

import { validateEnvironment } from './env-validation';

let validated = false;

/**
 * During `next build`, Next may evaluate server modules without full production env
 * (e.g. first Vercel deploy before dashboard env vars are set). Skip strict checks then.
 * Runtime requests still run validation on cold start.
 */
function isNextProductionBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-export'
  );
}

export function runStartupValidation() {
  if (typeof window !== 'undefined') {
    return;
  }

  if (isNextProductionBuildPhase()) {
    return;
  }

  // Valider uniquement côté serveur et une seule fois
  if (!validated) {
    try {
      validateEnvironment();
      validated = true;
    } catch (error) {
      console.error('\n' + '='.repeat(80));
      console.error('❌ STARTUP VALIDATION FAILED');
      console.error('='.repeat(80));
      console.error(error);
      console.error('='.repeat(80) + '\n');
      
      // En production, arrêter l'application
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
      
      throw error;
    }
  }
}
