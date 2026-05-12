/**
 * Validation au démarrage de l'application
 * Exécuté une seule fois côté serveur
 */

import { validateEnvironment } from './env-validation';

let validated = false;

export function runStartupValidation() {
  // Valider uniquement côté serveur et une seule fois
  if (typeof window === 'undefined' && !validated) {
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
