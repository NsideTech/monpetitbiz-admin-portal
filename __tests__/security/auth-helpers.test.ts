/**
 * Tests de sécurité pour les helpers d'authentification
 * Vérifie requireAuth et requireAdmin
 */

import jwt from 'jsonwebtoken';
import { requireAuth, requireAdmin, getUserFromSession } from '@/lib/auth-helpers';
import { getDatabase } from '@/lib/db';

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Mock getDatabase
jest.mock('@/lib/db', () => ({
  getDatabase: jest.fn(),
}));

const { cookies } = require('next/headers');

describe('Auth Helpers Security', () => {
  const mockJwtSecret = process.env.JWT_SECRET!;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should allow authenticated users', async () => {
      const validToken = jwt.sign(
        { userId: 'user-123', username: 'test', role: 'user' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const session = await requireAuth();
      
      expect(session).not.toBeNull();
      expect(session.userId).toBe('user-123');
    });

    it('should throw error for unauthenticated users', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should throw error for invalid JWT', async () => {
      const invalidToken = 'invalid.jwt.token';

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: invalidToken }),
      });

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should throw error for expired JWT', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-123', username: 'test', role: 'user' },
        mockJwtSecret,
        { expiresIn: '-1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: expiredToken }),
      });

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', async () => {
      const adminToken = jwt.sign(
        { userId: 'admin-123', username: 'admin', role: 'admin' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: adminToken }),
      });

      const session = await requireAdmin();
      
      expect(session).not.toBeNull();
      expect(session.role).toBe('admin');
    });

    it('should reject non-admin users', async () => {
      const managerToken = jwt.sign(
        { userId: 'user-123', username: 'manager', role: 'manager' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: managerToken }),
      });

      await expect(requireAdmin()).rejects.toThrow('Forbidden: Admin access required');
    });

    it('should reject unauthenticated users', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      await expect(requireAdmin()).rejects.toThrow('Unauthorized');
    });

    it('should reject users with tampered role (security test)', async () => {
      // Créer un token "user" valide
      const userToken = jwt.sign(
        { userId: 'user-123', username: 'hacker', role: 'user' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      // Essayer de modifier le rôle dans le payload (sans re-signer)
      const parts = userToken.split('.');
      const tamperedPayload = Buffer.from(
        JSON.stringify({ userId: 'user-123', username: 'hacker', role: 'admin' })
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: tamperedToken }),
      });

      // Le token tampered devrait être rejeté (signature invalide)
      await expect(requireAdmin()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getUserFromSession', () => {
    it('should return user without password', async () => {
      const validToken = jwt.sign(
        { userId: 'user-123', username: 'test', role: 'user' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const mockDb = {
        getUserById: jest.fn().mockResolvedValue({
          id: 'user-123',
          username: 'test',
          password: 'hashed-password-should-not-be-returned',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      };

      (getDatabase as jest.Mock).mockReturnValue(mockDb);

      const user = await getUserFromSession();
      
      expect(user).not.toBeNull();
      expect(user?.username).toBe('test');
      expect(user).not.toHaveProperty('password');
    });

    it('should return null for invalid session', async () => {
      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue(undefined),
      });

      const user = await getUserFromSession();
      expect(user).toBeNull();
    });

    it('should return null if user no longer exists in database', async () => {
      const validToken = jwt.sign(
        { userId: 'deleted-user', username: 'deleted', role: 'user' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      const mockDb = {
        getUserById: jest.fn().mockResolvedValue(null),
      };

      (getDatabase as jest.Mock).mockReturnValue(mockDb);

      const user = await getUserFromSession();
      expect(user).toBeNull();
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should handle concurrent authorization requests', async () => {
      const validToken = jwt.sign(
        { userId: 'user-123', username: 'test', role: 'admin' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: validToken }),
      });

      // Faire plusieurs appels en parallèle
      const results = await Promise.all([
        requireAuth(),
        requireAuth(),
        requireAdmin(),
      ]);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.userId).toBe('user-123');
      });
    });

    it('should handle missing JWT_SECRET gracefully', async () => {
      // Sauvegarder le secret original
      const originalSecret = process.env.JWT_SECRET;
      
      // Supprimer temporairement JWT_SECRET
      delete process.env.JWT_SECRET;

      (cookies as jest.Mock).mockResolvedValue({
        get: jest.fn().mockReturnValue({ value: 'some-token' }),
      });

      await expect(requireAuth()).rejects.toThrow();

      // Restaurer le secret
      process.env.JWT_SECRET = originalSecret;
    });
  });
});
