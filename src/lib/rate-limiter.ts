/**
 * Rate Limiter pour protéger contre les attaques par force brute
 * En mémoire pour démarrer (remplacer par Redis en production à grande échelle)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Map en mémoire pour stocker les tentatives
const attempts = new Map<string, RateLimitEntry>();

// Nettoyer les entrées expirées toutes les 10 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts.entries()) {
      if (entry.resetAt < now) {
        attempts.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Vérifie si une action est rate-limitée
 * 
 * @param key Identifiant unique (ex: "login:192.168.1.1:john")
 * @param maxAttempts Nombre maximum de tentatives autorisées
 * @param windowMs Fenêtre de temps en millisecondes
 * @returns Résultat avec allowed, remaining, et resetAt
 * 
 * @example
 * const result = checkRateLimit('login:127.0.0.1:admin', 5, 15 * 60 * 1000);
 * if (!result.allowed) {
 *   return 'Too many attempts';
 * }
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes par défaut
): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  // Première tentative ou fenêtre expirée
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    attempts.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: maxAttempts - 1,
      resetAt,
    };
  }

  // Incrémenter le compteur
  entry.count++;

  return {
    allowed: entry.count <= maxAttempts,
    remaining: Math.max(0, maxAttempts - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Réinitialiser le rate limit pour une clé spécifique
 * Utilisé après un login réussi par exemple
 * 
 * @param key Identifiant unique
 */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}

/**
 * Obtenir les statistiques de rate limiting
 * Utile pour le monitoring
 */
export function getRateLimitStats(): {
  totalKeys: number;
  blockedKeys: number;
} {
  let blockedKeys = 0;
  const now = Date.now();

  for (const [, entry] of attempts.entries()) {
    if (entry.resetAt > now && entry.count > 5) {
      blockedKeys++;
    }
  }

  return {
    totalKeys: attempts.size,
    blockedKeys,
  };
}
