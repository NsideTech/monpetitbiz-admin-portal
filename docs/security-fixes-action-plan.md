# Plan d'Action — Corrections de Sécurité Critiques

**Projet**: MonPetitBiz Admin Portal  
**Date**: 12 mai 2026  
**Priorité**: 🔴 CRITIQUE — À implémenter avant toute mise en production

---

## Vue d'ensemble

Ce document fournit un plan d'action étape par étape pour corriger les vulnérabilités de sécurité critiques identifiées lors de la revue de code.

**Temps estimé total**: 2-3 jours développeur

---

## Jour 1 — Authentification sécurisée

### Tâche 1.1: Implémenter JWT signé (4h)

#### Étape 1: Installer les dépendances
```bash
npm install jsonwebtoken
npm install -D @types/jsonwebtoken
```

#### Étape 2: Ajouter JWT_SECRET à l'environnement

Générer un secret fort:
```bash
# Générer un secret aléatoire de 64 caractères
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Ajouter à `.env.local`:
```bash
JWT_SECRET=votre_secret_genere_ici_64_caracteres_minimum
```

Ajouter à `env.example`:
```bash
# JWT Secret for session tokens (REQUIRED)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# IMPORTANT: Keep this secret and never commit it to git
JWT_SECRET=generate_a_strong_random_secret_here
```

#### Étape 3: Modifier login pour utiliser JWT

**Fichier**: `src/app/api/auth/login/route.ts`

```typescript
import jwt from 'jsonwebtoken';

// Ligne 37-43 - Remplacer par:
const sessionToken = jwt.sign(
  {
    userId: user.id,
    username: user.username,
    role: user.role,
    businessId: user.businessId,
  },
  process.env.JWT_SECRET!,
  { expiresIn: '7d' }
);
```

#### Étape 4: Modifier getSession pour vérifier JWT

**Fichier**: `src/lib/auth-helpers.ts`

```typescript
import jwt from 'jsonwebtoken';

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) {
      return null;
    }

    // Vérifier et décoder le JWT
    const decoded = jwt.verify(
      sessionToken,
      process.env.JWT_SECRET!
    ) as {
      userId: string;
      username: string;
      role: string;
      businessId?: string;
      iat: number;
      exp: number;
    };

    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
      businessId: decoded.businessId,
      expiresAt: decoded.exp * 1000, // Convertir en ms
    };
  } catch (error) {
    // JWT invalide, expiré ou secret incorrect
    console.error('Session validation failed:', error);
    return null;
  }
}
```

#### Étape 5: Valider JWT_SECRET au démarrage

**Nouveau fichier**: `src/lib/env-validation.ts`

```typescript
export function validateEnvironment() {
  const errors: string[] = [];

  // Vérifier JWT_SECRET
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET is not set');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Vérifier BACKEND_SERVICE_TOKEN
  if (!process.env.BACKEND_SERVICE_TOKEN) {
    errors.push('BACKEND_SERVICE_TOKEN is not set');
  }

  // Vérifier NEXT_PUBLIC_API_URL
  if (!process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL is not set');
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }

  console.log('✅ Environment validation passed');
}
```

**Fichier**: `src/app/layout.tsx` - Ajouter en haut:

```typescript
import { validateEnvironment } from '@/lib/env-validation';

// Valider au démarrage (côté serveur uniquement)
if (typeof window === 'undefined') {
  validateEnvironment();
}
```

#### Étape 6: Tests manuels

1. Supprimer le cookie `session_token` existant
2. Se connecter avec un compte valide
3. Vérifier que le nouveau token est un JWT (3 parties séparées par des points)
4. Essayer de modifier le token dans les DevTools
5. Vérifier que l'accès est refusé avec un token modifié

---

### Tâche 1.2: Rate limiting sur login (2h)

#### Étape 1: Créer le rate limiter

**Nouveau fichier**: `src/lib/rate-limiter.ts`

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Map en mémoire (pour démarrer, remplacer par Redis en production)
const attempts = new Map<string, RateLimitEntry>();

// Nettoyer les entrées expirées toutes les 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts.entries()) {
    if (entry.resetAt < now) {
      attempts.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Vérifie si une action est rate-limitée
 * @param key Identifiant unique (ex: "login:IP:username")
 * @param maxAttempts Nombre max de tentatives
 * @param windowMs Fenêtre de temps en ms
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
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
 * Réinitialiser le rate limit pour une clé (ex: après succès)
 */
export function resetRateLimit(key: string): void {
  attempts.delete(key);
}
```

#### Étape 2: Appliquer le rate limiter au login

**Fichier**: `src/app/api/auth/login/route.ts`

```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `login:${clientIp}:${username}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for ${username} from ${clientIp}`);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please try again in 15 minutes.',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
        { status: 429 }
      );
    }

    const db = getDatabase();
    const user = await db.getUserByUsername(username);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Login réussi - réinitialiser le rate limit
    resetRateLimit(rateLimitKey);

    // Créer le JWT (code modifié dans tâche 1.1)
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        businessId: user.businessId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // ... reste du code
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Étape 3: Tests manuels

1. Tenter de se connecter 6 fois avec un mauvais mot de passe
2. Vérifier que la 6ème tentative est bloquée avec status 429
3. Attendre 15 minutes (ou modifier le délai à 1 minute pour tester)
4. Vérifier que le login fonctionne à nouveau

---

### Tâche 1.3: Logger les tentatives suspectes (1h)

#### Créer un système de log sécurisé

**Nouveau fichier**: `src/lib/security-logger.ts`

```typescript
interface SecurityEvent {
  type: 'login_failed' | 'login_success' | 'rate_limit_exceeded' | 'invalid_token' | 'unauthorized_access';
  username?: string;
  userId?: string;
  ip: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Logger les événements de sécurité
 * En production, envoyer vers un service externe (Datadog, Sentry, etc.)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  };

  // En développement, afficher dans la console
  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 Security Event:', JSON.stringify(logEntry, null, 2));
  }

  // En production, envoyer vers un service de monitoring
  // TODO: Intégrer avec Datadog, Sentry, CloudWatch, etc.
  
  // Pour l'instant, écrire dans un fichier de log
  // (À remplacer par une vraie solution en production)
  try {
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to write security log:', error);
  }
}
```

#### Intégrer dans login

**Fichier**: `src/app/api/auth/login/route.ts`

```typescript
import { logSecurityEvent } from '@/lib/security-logger';

// Après vérification du mot de passe
if (!isValidPassword) {
  logSecurityEvent({
    type: 'login_failed',
    username,
    ip: clientIp,
    userAgent: request.headers.get('user-agent') || undefined,
    timestamp: new Date().toISOString(),
    details: { reason: 'invalid_password' },
  });
  
  return NextResponse.json(
    { success: false, message: 'Invalid username or password' },
    { status: 401 }
  );
}

// Après login réussi
logSecurityEvent({
  type: 'login_success',
  username: user.username,
  userId: user.id,
  ip: clientIp,
  userAgent: request.headers.get('user-agent') || undefined,
  timestamp: new Date().toISOString(),
});

// Après rate limit dépassé
if (!rateLimit.allowed) {
  logSecurityEvent({
    type: 'rate_limit_exceeded',
    username,
    ip: clientIp,
    userAgent: request.headers.get('user-agent') || undefined,
    timestamp: new Date().toISOString(),
    details: { attempts: rateLimit.remaining + 5 },
  });
  
  // ...
}
```

---

## Jour 2 — Tests et validation

### Tâche 2.1: Configuration de Jest (2h)

#### Étape 1: Installer Jest

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest
```

#### Étape 2: Configuration Jest

**Nouveau fichier**: `jest.config.js`

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

**Nouveau fichier**: `jest.setup.js`

```javascript
import '@testing-library/jest-dom';
```

#### Étape 3: Ajouter scripts de test

**Fichier**: `package.json`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

### Tâche 2.2: Tests de sécurité critiques (4h)

#### Test 1: JWT signé correctement

**Nouveau fichier**: `__tests__/lib/auth-helpers.test.ts`

```typescript
import jwt from 'jsonwebtoken';
import { getSession } from '@/lib/auth-helpers';
import { cookies } from 'next/headers';

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('Auth Helpers - Security', () => {
  const mockJwtSecret = 'test-secret-at-least-32-characters-long';
  
  beforeAll(() => {
    process.env.JWT_SECRET = mockJwtSecret;
  });

  it('should reject tampered JWT tokens', async () => {
    // Créer un token valide
    const validToken = jwt.sign(
      { userId: '123', username: 'user', role: 'user' },
      mockJwtSecret,
      { expiresIn: '1h' }
    );

    // Modifier le token (simuler une attaque)
    const tamperedToken = validToken.replace('user', 'admin');

    // Mock cookies pour retourner le token modifié
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: tamperedToken }),
    });

    // La fonction doit retourner null car le token est invalide
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('should accept valid JWT tokens', async () => {
    const validToken = jwt.sign(
      { userId: '123', username: 'testuser', role: 'admin' },
      mockJwtSecret,
      { expiresIn: '1h' }
    );

    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn().mockReturnValue({ value: validToken }),
    });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.username).toBe('testuser');
    expect(session?.role).toBe('admin');
  });

  it('should reject expired JWT tokens', async () => {
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
});
```

#### Test 2: Rate limiting fonctionne

**Nouveau fichier**: `__tests__/lib/rate-limiter.test.ts`

```typescript
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Nettoyer entre chaque test
    resetRateLimit('test:key');
  });

  it('should allow requests under the limit', () => {
    const result1 = checkRateLimit('test:key', 3);
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);

    const result2 = checkRateLimit('test:key', 3);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = checkRateLimit('test:key', 3);
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests over the limit', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test:key', 3);
    }

    const blockedResult = checkRateLimit('test:key', 3);
    expect(blockedResult.allowed).toBe(false);
    expect(blockedResult.remaining).toBe(0);
  });

  it('should reset after manual reset', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test:key', 3);
    }

    resetRateLimit('test:key');

    const result = checkRateLimit('test:key', 3);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });
});
```

#### Test 3: API login avec rate limiting

**Nouveau fichier**: `__tests__/api/auth/login.test.ts`

```typescript
import { POST } from '@/app/api/auth/login/route';
import { NextRequest } from 'next/server';

describe('POST /api/auth/login - Rate Limiting', () => {
  it('should block after too many failed attempts', async () => {
    const makeRequest = () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'test', password: 'wrong' }),
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });
      return POST(request);
    };

    // 5 tentatives échouées
    for (let i = 0; i < 5; i++) {
      const response = await makeRequest();
      expect(response.status).toBe(401);
    }

    // 6ème tentative devrait être bloquée
    const blockedResponse = await makeRequest();
    expect(blockedResponse.status).toBe(429);

    const body = await blockedResponse.json();
    expect(body.message).toContain('Too many login attempts');
  });
});
```

---

### Tâche 2.3: Exécuter et valider les tests (1h)

```bash
# Lancer les tests
npm test

# Vérifier la couverture
npm run test:coverage

# Objectif: 100% de couverture sur les fonctions de sécurité critiques
```

---

## Jour 3 — CSRF et finalisation

### Tâche 3.1: Protection CSRF (3h)

#### Étape 1: Implémenter CSRF tokens

**Nouveau fichier**: `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Générer un token CSRF s'il n'existe pas
  if (!request.cookies.get('csrf_token')) {
    const csrfToken = randomBytes(32).toString('hex');
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Le client doit pouvoir le lire
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24h
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### Étape 2: Valider CSRF dans les mutations

**Nouveau fichier**: `src/lib/csrf.ts`

```typescript
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function validateCsrfToken(request: NextRequest): Promise<boolean> {
  // Méthodes sûres exemptées
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true;
  }

  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get('csrf_token')?.value;
  const csrfHeader = request.headers.get('x-csrf-token');

  if (!csrfCookie || !csrfHeader) {
    return false;
  }

  return csrfCookie === csrfHeader;
}
```

#### Étape 3: Appliquer dans toutes les routes de mutation

**Exemple dans**: `src/app/api/users/route.ts`

```typescript
import { validateCsrfToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  // Valider CSRF
  if (!await validateCsrfToken(request)) {
    return NextResponse.json(
      { success: false, message: 'Invalid CSRF token' },
      { status: 403 }
    );
  }

  // ... reste du code
}
```

#### Étape 4: Modifier le client pour envoyer le token

**Fichier**: `src/lib/api.ts`

```typescript
// Dans ApiClient constructor
this.client.interceptors.request.use(
  (config) => {
    // Ajouter le token CSRF pour les mutations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method?.toUpperCase() || '')) {
      const csrfToken = Cookies.get('csrf_token');
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```

---

### Tâche 3.2: Documentation et déploiement (2h)

#### Mettre à jour la documentation

**Fichier**: `docs/security.md` (nouveau)

```markdown
# Sécurité — MonPetitBiz Admin Portal

## Authentification

Le portail utilise JWT (JSON Web Tokens) signés avec un secret cryptographique fort pour gérer les sessions utilisateur.

### Configuration requise

- `JWT_SECRET`: Secret de 32+ caractères pour signer les tokens (OBLIGATOIRE)
- Générer avec: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Session

- Durée: 7 jours
- Stockage: Cookie httpOnly, secure, sameSite=strict
- Validation: Signature JWT vérifiée à chaque requête

## Rate Limiting

Protection contre les attaques par force brute:

- **Login**: 5 tentatives max / 15 minutes par IP
- Réinitialisation automatique après login réussi
- Logs de sécurité pour tentatives excessives

## CSRF Protection

Tous les endpoints de mutation (POST, PUT, PATCH, DELETE) requièrent un token CSRF valide:

- Token généré automatiquement au premier chargement
- Envoyé dans le header `X-CSRF-Token`
- Validé côté serveur

## Logging de sécurité

Tous les événements de sécurité sont loggés:

- Tentatives de connexion échouées
- Rate limiting dépassé
- Tokens invalides
- Accès non autorisés

En production, les logs sont envoyés vers [Service de monitoring à configurer].
```

#### Créer un script de vérification

**Nouveau fichier**: `scripts/check-security.ts`

```typescript
#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

interface SecurityCheck {
  name: string;
  check: () => boolean;
  severity: 'critical' | 'important' | 'warning';
}

const checks: SecurityCheck[] = [
  {
    name: 'JWT_SECRET est configuré',
    check: () => !!process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32,
    severity: 'critical',
  },
  {
    name: 'BACKEND_SERVICE_TOKEN est configuré',
    check: () => !!process.env.BACKEND_SERVICE_TOKEN,
    severity: 'critical',
  },
  {
    name: 'Tests de sécurité existent',
    check: () => fs.existsSync(path.join(__dirname, '../__tests__/lib/auth-helpers.test.ts')),
    severity: 'critical',
  },
  {
    name: 'CSRF middleware existe',
    check: () => fs.existsSync(path.join(__dirname, '../src/middleware.ts')),
    severity: 'important',
  },
];

console.log('🔒 Security Check\n');

let failed = 0;
let critical = 0;

checks.forEach(check => {
  const passed = check.check();
  const icon = passed ? '✅' : '❌';
  const severity = check.severity === 'critical' ? '🔴' : check.severity === 'important' ? '🟡' : '🟢';
  
  console.log(`${icon} ${severity} ${check.name}`);
  
  if (!passed) {
    failed++;
    if (check.severity === 'critical') {
      critical++;
    }
  }
});

console.log(`\n📊 Résultat: ${checks.length - failed}/${checks.length} vérifications passées`);

if (critical > 0) {
  console.log(`\n🔴 ${critical} vérification(s) critique(s) échouée(s)`);
  console.log('⚠️  NE PAS DÉPLOYER EN PRODUCTION');
  process.exit(1);
} else if (failed > 0) {
  console.log(`\n🟡 ${failed} vérification(s) échouée(s)`);
  console.log('⚠️  Recommandation: corriger avant déploiement');
  process.exit(1);
} else {
  console.log('\n✅ Toutes les vérifications de sécurité sont passées');
  process.exit(0);
}
```

Ajouter au `package.json`:
```json
{
  "scripts": {
    "security:check": "tsx scripts/check-security.ts"
  }
}
```

---

## Validation finale

### Checklist avant commit

- [ ] JWT implémenté et testé
- [ ] Rate limiting actif
- [ ] CSRF protection active
- [ ] Tests écrits et qui passent (`npm test`)
- [ ] Security check passe (`npm run security:check`)
- [ ] Documentation à jour
- [ ] Variables d'environnement validées au démarrage
- [ ] Logs de sécurité fonctionnels

### Commandes de validation

```bash
# Vérifier l'environnement
npm run security:check

# Lancer les tests
npm test

# Vérifier le TypeScript
npm run type-check

# Linter
npm run lint

# Build de production
npm run build
```

### Déploiement

```bash
# 1. S'assurer que .env.production contient JWT_SECRET
# 2. Déployer
npm run build
npm start

# 3. Vérifier les logs de démarrage pour "✅ Environment validation passed"
```

---

## Support

En cas de problème lors de l'implémentation:

1. Vérifier les logs de sécurité dans `logs/`
2. Consulter le rapport de revue détaillé: `docs/code-review-report.md`
3. Contacter: fabrice@ilboudotechnologies.ca
