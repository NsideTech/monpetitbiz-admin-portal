/**
 * Tests de sécurité pour la validation JWT
 * Ces tests vérifient que les tokens JWT sont correctement signés et validés
 */

import jwt from 'jsonwebtoken';
import { getSession } from '@/lib/auth-helpers';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock getDatabase pour éviter les dépendances DB dans les tests
jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(),
}));

const { cookies } = require('next/headers');

describe('JWT Security - Token Validation', () => {
  const mockJwtSecret = process.env.JWT_SECRET!;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Valid JWT Tokens', () => {
    it('should accept a valid JWT token', async () => {
      const validToken = jwt.sign(
        {
          userId: 'user-123',
          username: 'testuser',
          role: 'admin',
          businessId: 'business-456',
        },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const session = await getSession();
      
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user-123');
      expect(session?.username).toBe('testuser');
      expect(session?.role).toBe('admin');
      expect(session?.businessId).toBe('business-456');
    });

    it('should accept a valid JWT token without businessId', async () => {
      const validToken = jwt.sign(
        {
          userId: 'user-789',
          username: 'manager',
          role: 'manager',
        },
        mockJwtSecret,
        { expiresIn: '7d' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const session = await getSession();
      
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user-789');
      expect(session?.businessId).toBeUndefined();
    });
  });

  describe('Invalid JWT Tokens - Tampering', () => {
    it('should reject a tampered JWT token (modified payload)', async () => {
      // Créer un token valide
      const validToken = jwt.sign(
        { userId: '123', username: 'user', role: 'user' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      // Modifier le token (simuler une attaque)
      // Remplacer "user" par "admin" dans le payload encodé
      const parts = validToken.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: '123', username: 'user', role: 'admin' })
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      // La fonction doit retourner null car le token est invalide
      const session = await getSession();
      expect(session).toBeNull();
    });

    it('should reject a JWT token with invalid signature', async () => {
      const tokenWithWrongSecret = jwt.sign(
        { userId: '123', username: 'user', role: 'admin' },
        'wrong-secret-that-does-not-match',
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tokenWithWrongSecret }),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('should reject a completely fake JWT token', async () => {
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.signature';

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: fakeToken }),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('should reject a malformed token', async () => {
      const malformedToken = 'not.a.valid.jwt.token.at.all';

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: malformedToken }),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('Expired JWT Tokens', () => {
    it('should reject an expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', username: 'user', role: 'user' },
        mockJwtSecret,
        { expiresIn: '-1h' } // Expiré il y a 1h
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: expiredToken }),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('should reject a token that expired 1 second ago', async () => {
      const expiredToken = jwt.sign(
        { userId: '123', username: 'user', role: 'admin' },
        mockJwtSecret,
        { expiresIn: '-1s' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: expiredToken }),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('Missing or Invalid Cookies', () => {
    it('should return null when no cookie is present', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });

    it('should return null when cookie value is empty', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: '' }),
      });

      const session = await getSession();
      expect(session).toBeNull();
    });
  });

  describe('Token Expiration Time', () => {
    it('should include correct expiration timestamp', async () => {
      const now = Math.floor(Date.now() / 1000);
      const validToken = jwt.sign(
        { userId: '123', username: 'user', role: 'user' },
        mockJwtSecret,
        { expiresIn: '7d' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const session = await getSession();
      
      expect(session).not.toBeNull();
      expect(session?.expiresAt).toBeGreaterThan(now * 1000);
      
      // Should expire in approximately 7 days (with 1 minute tolerance)
      const expectedExpiration = now + (7 * 24 * 60 * 60);
      const actualExpiration = session!.expiresAt / 1000;
      expect(actualExpiration).toBeGreaterThan(expectedExpiration - 60);
      expect(actualExpiration).toBeLessThan(expectedExpiration + 60);
    });
  });
});
