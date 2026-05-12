/**
 * Tests de sécurité pour la protection CSRF
 * Vérifie que les requêtes de mutation sont protégées contre CSRF
 */

import { getCsrfToken, isCsrfRequired } from '@/lib/csrf';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock pour simuler NextRequest sans importer next/server
const createMockRequest = (method: string, headers: Record<string, string> = {}) => ({
  method,
  headers: {
    get: (key: string) => headers[key.toLowerCase()] || null,
  },
});

const { cookies } = require('next/headers');

describe('CSRF Protection', () => {
  const mockCsrfToken = 'test-csrf-token-1234567890abcdef';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCsrfToken', () => {
    // Import dynamique pour éviter les problèmes avec NextRequest
    let validateCsrfToken: any;

    beforeAll(async () => {
      const csrfModule = await import('@/lib/csrf');
      validateCsrfToken = csrfModule.validateCsrfToken;
    });

    describe('Safe Methods (GET, HEAD, OPTIONS)', () => {
      it('should allow GET requests without CSRF token', async () => {
        const request = createMockRequest('GET');

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });

      it('should allow HEAD requests without CSRF token', async () => {
        const request = createMockRequest('HEAD');

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });

      it('should allow OPTIONS requests without CSRF token', async () => {
        const request = createMockRequest('OPTIONS');

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });
    });

    describe('Unsafe Methods (POST, PUT, PATCH, DELETE)', () => {
      it('should allow POST with valid CSRF token', async () => {
        const request = createMockRequest('POST', {
          'x-csrf-token': mockCsrfToken,
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });

      it('should allow PUT with valid CSRF token', async () => {
        const request = createMockRequest('PUT', {
          'x-csrf-token': mockCsrfToken,
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });

      it('should allow PATCH with valid CSRF token', async () => {
        const request = createMockRequest('PATCH', {
          'x-csrf-token': mockCsrfToken,
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });

      it('should allow DELETE with valid CSRF token', async () => {
        const request = createMockRequest('DELETE', {
          'x-csrf-token': mockCsrfToken,
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(true);
      });

      it('should reject POST without CSRF token in header', async () => {
        const request = createMockRequest('POST');

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(false);
      });

      it('should reject POST without CSRF token in cookie', async () => {
        const request = createMockRequest('POST', {
          'x-csrf-token': mockCsrfToken,
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue(undefined), // Pas de cookie
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(false);
      });

      it('should reject POST with mismatched CSRF tokens', async () => {
        const request = createMockRequest('POST', {
          'x-csrf-token': 'different-token',
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(false);
      });

      it('should reject POST with empty CSRF token in header', async () => {
        const request = createMockRequest('POST', {
          'x-csrf-token': '',
        });

        (cookies as jest.Mock).mockResolvedValue({
          get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
        });

        const isValid = await validateCsrfToken(request);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token from cookies', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
      });

      const token = await getCsrfToken();
      expect(token).toBe(mockCsrfToken);
    });

    it('should return null when no CSRF token exists', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const token = await getCsrfToken();
      expect(token).toBeNull();
    });
  });

  describe('isCsrfRequired', () => {
    it('should return false for GET', () => {
      expect(isCsrfRequired('GET')).toBe(false);
    });

    it('should return false for HEAD', () => {
      expect(isCsrfRequired('HEAD')).toBe(false);
    });

    it('should return false for OPTIONS', () => {
      expect(isCsrfRequired('OPTIONS')).toBe(false);
    });

    it('should return true for POST', () => {
      expect(isCsrfRequired('POST')).toBe(true);
    });

    it('should return true for PUT', () => {
      expect(isCsrfRequired('PUT')).toBe(true);
    });

    it('should return true for PATCH', () => {
      expect(isCsrfRequired('PATCH')).toBe(true);
    });

    it('should return true for DELETE', () => {
      expect(isCsrfRequired('DELETE')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isCsrfRequired('post')).toBe(true);
      expect(isCsrfRequired('get')).toBe(false);
    });
  });

  describe('CSRF Attack Scenarios', () => {
    let validateCsrfToken: any;

    beforeAll(async () => {
      const csrfModule = await import('@/lib/csrf');
      validateCsrfToken = csrfModule.validateCsrfToken;
    });

    it('should prevent CSRF attack from malicious site', async () => {
      // Scénario: Un site malveillant essaie de forcer une requête POST
      // L'attaquant a le cookie de session, mais pas le token CSRF
      const maliciousRequest = createMockRequest('POST', {
        'x-csrf-token': 'guessed-token-12345',
      });

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
      });

      const isValid = await validateCsrfToken(maliciousRequest);
      expect(isValid).toBe(false); // ✅ Attaque bloquée
    });

    it('should allow legitimate request from same origin', async () => {
      // Scénario: L'application légitime fait une requête POST
      // Elle a accès au cookie ET peut le lire pour l'envoyer dans le header
      const legitimateRequest = createMockRequest('POST', {
        'x-csrf-token': mockCsrfToken,
      });

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
      });

      const isValid = await validateCsrfToken(legitimateRequest);
      expect(isValid).toBe(true); // ✅ Requête légitime autorisée
    });

    it('should prevent token reuse attack', async () => {
      // Scénario: Un attaquant essaie de réutiliser un ancien token
      const oldToken = 'old-csrf-token-expired';
      const currentToken = 'current-csrf-token-active';

      const request = createMockRequest('POST', {
        'x-csrf-token': oldToken,
      });

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: currentToken }), // Token actuel différent
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(false); // ✅ Ancien token rejeté
    });
  });

  describe('Edge Cases', () => {
    let validateCsrfToken: any;

    beforeAll(async () => {
      const csrfModule = await import('@/lib/csrf');
      validateCsrfToken = csrfModule.validateCsrfToken;
    });

    it('should handle requests with null CSRF cookie', async () => {
      const request = createMockRequest('POST', {
        'x-csrf-token': mockCsrfToken,
      });

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(null),
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(false);
    });

    it('should handle requests with undefined CSRF header', async () => {
      const request = createMockRequest('POST');

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: mockCsrfToken }),
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(false);
    });

    it('should handle very long CSRF tokens', async () => {
      const longToken = 'a'.repeat(1000);
      
      const request = createMockRequest('POST', {
        'x-csrf-token': longToken,
      });

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: longToken }),
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(true);
    });

    it('should handle special characters in CSRF tokens', async () => {
      const specialToken = 'token-with-special-chars-!@#$%^&*()';
      
      const request = createMockRequest('POST', {
        'x-csrf-token': specialToken,
      });

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: specialToken }),
      });

      const isValid = await validateCsrfToken(request);
      expect(isValid).toBe(true);
    });
  });
});
