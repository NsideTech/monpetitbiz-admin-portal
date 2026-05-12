/**
 * Tests de sécurité pour le rate limiter
 * Vérifie la protection contre les attaques par force brute
 */

import { checkRateLimit, resetRateLimit, getRateLimitStats } from '@/lib/rate-limiter';

describe('Rate Limiter Security', () => {
  const testKey = 'test:rate:limit';
  
  beforeEach(() => {
    // Nettoyer entre chaque test
    resetRateLimit(testKey);
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests under the limit', () => {
      const result1 = checkRateLimit(testKey, 3, 15 * 60 * 1000);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit(testKey, 3, 15 * 60 * 1000);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit(testKey, 3, 15 * 60 * 1000);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      // Faire 3 tentatives (la limite)
      for (let i = 0; i < 3; i++) {
        checkRateLimit(testKey, 3, 15 * 60 * 1000);
      }

      // 4ème tentative devrait être bloquée
      const blockedResult = checkRateLimit(testKey, 3, 15 * 60 * 1000);
      expect(blockedResult.allowed).toBe(false);
      expect(blockedResult.remaining).toBe(0);
    });

    it('should continue blocking after limit is reached', () => {
      // Dépasser la limite
      for (let i = 0; i < 5; i++) {
        checkRateLimit(testKey, 3, 15 * 60 * 1000);
      }

      // Toutes les tentatives suivantes doivent être bloquées
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(testKey, 3, 15 * 60 * 1000);
        expect(result.allowed).toBe(false);
      }
    });
  });

  describe('Login Attack Simulation', () => {
    it('should block a brute force attack (5 attempts)', () => {
      const attackKey = 'login:attacker-ip:admin';
      const maxAttempts = 5;

      // Simuler 5 tentatives échouées
      for (let i = 0; i < maxAttempts; i++) {
        const result = checkRateLimit(attackKey, maxAttempts, 15 * 60 * 1000);
        expect(result.allowed).toBe(true);
      }

      // 6ème tentative devrait être bloquée
      const blocked = checkRateLimit(attackKey, maxAttempts, 15 * 60 * 1000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);

      // Nettoyer
      resetRateLimit(attackKey);
    });

    it('should maintain separate counters for different IPs', () => {
      const ip1 = 'login:192.168.1.1:admin';
      const ip2 = 'login:192.168.1.2:admin';

      // IP1 fait 3 tentatives
      for (let i = 0; i < 3; i++) {
        checkRateLimit(ip1, 5, 15 * 60 * 1000);
      }

      // IP2 devrait avoir son propre compteur
      const ip2Result = checkRateLimit(ip2, 5, 15 * 60 * 1000);
      expect(ip2Result.allowed).toBe(true);
      expect(ip2Result.remaining).toBe(4); // Premier essai pour IP2

      resetRateLimit(ip1);
      resetRateLimit(ip2);
    });

    it('should maintain separate counters for different usernames', () => {
      const user1 = 'login:192.168.1.1:alice';
      const user2 = 'login:192.168.1.1:bob';

      // Alice fait 5 tentatives (bloquée)
      for (let i = 0; i < 6; i++) {
        checkRateLimit(user1, 5, 15 * 60 * 1000);
      }
      const aliceBlocked = checkRateLimit(user1, 5, 15 * 60 * 1000);
      expect(aliceBlocked.allowed).toBe(false);

      // Bob devrait avoir son propre compteur (même IP)
      const bobResult = checkRateLimit(user2, 5, 15 * 60 * 1000);
      expect(bobResult.allowed).toBe(true);
      expect(bobResult.remaining).toBe(4);

      resetRateLimit(user1);
      resetRateLimit(user2);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset rate limit after manual reset', () => {
      // Dépasser la limite
      for (let i = 0; i < 5; i++) {
        checkRateLimit(testKey, 3, 15 * 60 * 1000);
      }

      // Vérifier qu'on est bloqué
      const blocked = checkRateLimit(testKey, 3, 15 * 60 * 1000);
      expect(blocked.allowed).toBe(false);

      // Reset manuel (comme après un login réussi)
      resetRateLimit(testKey);

      // Devrait être autorisé à nouveau
      const afterReset = checkRateLimit(testKey, 3, 15 * 60 * 1000);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(2);
    });

    it('should allow new attempts after successful login', () => {
      const loginKey = 'login:127.0.0.1:alice';

      // 4 tentatives échouées
      for (let i = 0; i < 4; i++) {
        checkRateLimit(loginKey, 5, 15 * 60 * 1000);
      }

      // Login réussi - reset
      resetRateLimit(loginKey);

      // Nouvelles tentatives devraient être autorisées
      const result = checkRateLimit(loginKey, 5, 15 * 60 * 1000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);

      resetRateLimit(loginKey);
    });
  });

  describe('Time Window', () => {
    it('should reset automatically after time window expires', () => {
      const shortWindow = 100; // 100ms window pour le test
      
      // Faire 3 tentatives
      for (let i = 0; i < 3; i++) {
        checkRateLimit(testKey, 3, shortWindow);
      }

      // Devrait être bloqué
      const blocked = checkRateLimit(testKey, 3, shortWindow);
      expect(blocked.allowed).toBe(false);

      // Attendre que la fenêtre expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Après expiration, devrait être autorisé
          const afterExpiry = checkRateLimit(testKey, 3, shortWindow);
          expect(afterExpiry.allowed).toBe(true);
          expect(afterExpiry.remaining).toBe(2);
          resolve();
        }, shortWindow + 50);
      });
    });

    it('should provide correct resetAt timestamp', () => {
      const windowMs = 15 * 60 * 1000; // 15 minutes
      const before = Date.now();
      
      const result = checkRateLimit(testKey, 5, windowMs);
      
      const after = Date.now();
      const expectedResetAt = before + windowMs;
      
      expect(result.resetAt).toBeGreaterThanOrEqual(expectedResetAt);
      expect(result.resetAt).toBeLessThanOrEqual(after + windowMs);
    });
  });

  describe('Different Limits and Windows', () => {
    it('should respect custom maxAttempts', () => {
      const customKey = 'test:custom:limit';
      
      // Limite de 2 tentatives
      const r1 = checkRateLimit(customKey, 2, 15 * 60 * 1000);
      expect(r1.allowed).toBe(true);
      
      const r2 = checkRateLimit(customKey, 2, 15 * 60 * 1000);
      expect(r2.allowed).toBe(true);
      
      // 3ème tentative bloquée
      const r3 = checkRateLimit(customKey, 2, 15 * 60 * 1000);
      expect(r3.allowed).toBe(false);

      resetRateLimit(customKey);
    });

    it('should respect custom time windows', () => {
      const key1 = 'test:window:1min';
      const key2 = 'test:window:5min';
      
      const r1 = checkRateLimit(key1, 5, 1 * 60 * 1000); // 1 minute
      const r2 = checkRateLimit(key2, 5, 5 * 60 * 1000); // 5 minutes
      
      expect(r1.resetAt).toBeLessThan(r2.resetAt);
      
      const diff = r2.resetAt - r1.resetAt;
      expect(diff).toBeGreaterThanOrEqual(4 * 60 * 1000); // Au moins 4 minutes de différence

      resetRateLimit(key1);
      resetRateLimit(key2);
    });
  });

  describe('Statistics', () => {
    it('should track rate limit statistics', () => {
      const statsKey1 = 'test:stats:key1';
      const statsKey2 = 'test:stats:key2';

      // Créer quelques tentatives
      checkRateLimit(statsKey1, 5, 15 * 60 * 1000);
      checkRateLimit(statsKey2, 5, 15 * 60 * 1000);

      const stats = getRateLimitStats();
      expect(stats.totalKeys).toBeGreaterThanOrEqual(2);

      resetRateLimit(statsKey1);
      resetRateLimit(statsKey2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short time windows', () => {
      const result = checkRateLimit(testKey, 5, 1); // 1ms window
      expect(result.allowed).toBe(true);
    });

    it('should handle very large time windows', () => {
      const result = checkRateLimit(testKey, 5, 365 * 24 * 60 * 60 * 1000); // 1 year
      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it('should handle limit of 1', () => {
      const strictKey = 'test:strict:limit';
      
      const r1 = checkRateLimit(strictKey, 1, 15 * 60 * 1000);
      expect(r1.allowed).toBe(true);
      
      const r2 = checkRateLimit(strictKey, 1, 15 * 60 * 1000);
      expect(r2.allowed).toBe(false);

      resetRateLimit(strictKey);
    });
  });
});
