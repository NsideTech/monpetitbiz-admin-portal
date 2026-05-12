# Rapport de Revue de Code — MonPetitBiz Admin Portal
**Date**: 12 mai 2026  
**Révisé par**: Fabrice Ilboudo — Ilboudo Technologies Inc.  
**Version**: 1.0.0  
**Portée**: Revue complète (sécurité, architecture, qualité, performances)

---

## Résumé Exécutif

Le portail admin MonPetitBiz est une application Next.js (v14) qui fournit une interface de gestion pour les entreprises. Le projet est **fonctionnel mais présente des risques de sécurité critiques** qui doivent être corrigés avant toute mise en production.

### Statistiques du projet
- **Lignes de code**: ~6,400 lignes (TypeScript/TSX)
- **Fichiers sources**: 46 fichiers (29 .ts, 17 .tsx)
- **Dépendances**: 11 production, 6 dev (node_modules manquants)
- **Tests**: ❌ Aucun test trouvé
- **Documentation**: ✅ Bonne (README, guides DB, intégration backend)

### Notation globale

| Aspect | Note | Statut |
|--------|------|---------|
| **Sécurité** | 🔴 3/10 | CRITIQUE |
| **Architecture** | 🟡 6/10 | À améliorer |
| **Qualité du code** | 🟢 7/10 | Acceptable |
| **Performance** | 🟢 7/10 | Acceptable |
| **Maintenabilité** | 🟡 6/10 | À améliorer |
| **Documentation** | 🟢 8/10 | Bien |
| **Tests** | 🔴 0/10 | CRITIQUE |

**Recommandation**: ❌ **NON PRÊT pour la production** sans corrections critiques.

---

## 🔴 Problèmes de sécurité CRITIQUES

### 1. Token de session non signé et prédictible
**Sévérité**: 🔴 **BLOQUANT**  
**Fichier**: `src/app/api/auth/login/route.ts:37-43`

```typescript
const sessionToken = Buffer.from(JSON.stringify({
  userId: user.id,
  username: user.username,
  role: user.role,
  businessId: user.businessId,
  expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
})).toString('base64');
```

**Problème**:
- Le token est simplement un objet JSON encodé en base64, **sans signature cryptographique**
- N'importe qui peut décoder le token, modifier le contenu (par exemple, changer le rôle en 'admin'), et le ré-encoder
- Pas de secret, pas de vérification d'intégrité

**Impact**: 
- ⚠️ **Élévation de privilèges triviale**: Un utilisateur normal peut se donner des droits admin
- ⚠️ **Usurpation d'identité**: Un attaquant peut se connecter en tant que n'importe quel utilisateur
- ⚠️ **Bypass total de l'authentification**

**Solution**:
```typescript
import jwt from 'jsonwebtoken';

const sessionToken = jwt.sign(
  {
    userId: user.id,
    username: user.username,
    role: user.role,
    businessId: user.businessId,
  },
  process.env.JWT_SECRET!, // Secret fort et aléatoire
  { expiresIn: '7d' }
);
```

Ajouter la vérification:
```typescript
// Dans auth-helpers.ts
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (!sessionToken) return null;

    // Vérifier et décoder avec JWT
    const decoded = jwt.verify(sessionToken, process.env.JWT_SECRET!) as SessionUser;
    return decoded;
  } catch (error) {
    return null; // Token invalide ou expiré
  }
}
```

**Dépendance à ajouter**: `jsonwebtoken` + `@types/jsonwebtoken`

---

### 2. Token de service backend exposé côté client
**Sévérité**: 🔴 **BLOQUANT**  
**Fichier**: `src/lib/api.ts:113-116`

```typescript
getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return Cookies.get('session_token') || null;
}
```

**Problème**:
- La classe `ApiClient` tente de lire le token depuis le navigateur pour les requêtes au backend externe
- Le `BACKEND_SERVICE_TOKEN` (token admin avec accès à tous les business) est censé être côté serveur uniquement
- Risque de confusion entre le token utilisateur et le token de service

**Impact**:
- Potentiel de fuite du token admin si mal utilisé
- Architecture confuse avec deux systèmes d'authentification parallèles

**Solution**:
1. **Clarifier les responsabilités**:
   - `apiClient` (client-side) → pour les routes `/api/*` du portail Next.js (utilise cookies httpOnly automatiquement)
   - `monpetitbizDb` (server-side) → pour communiquer avec le backend externe (utilise BACKEND_SERVICE_TOKEN)

2. **Supprimer `getToken()` du client**:
```typescript
// Dans api.ts - version client-side
// Pas besoin d'interceptor avec Authorization header manuel
// Les cookies httpOnly sont envoyés automatiquement
this.client.interceptors.request.use(
  (config) => config, // Pas de token manuel
  (error) => Promise.reject(error)
);
```

---

### 3. Pas de protection CSRF
**Sévérité**: 🟡 **IMPORTANT**  
**Fichiers**: Toutes les routes API POST/PATCH/DELETE

**Problème**:
- Aucun token CSRF n'est implémenté
- Les cookies `sameSite: 'strict'` offrent une protection partielle, mais insuffisante

**Impact**:
- Un site malveillant pourrait potentiellement forcer un admin connecté à faire des actions non désirées

**Solution**:
Implémenter un système CSRF avec Next.js :
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Ajouter un token CSRF dans un cookie
  if (!request.cookies.get('csrf_token')) {
    const csrfToken = crypto.randomUUID();
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Le client doit pouvoir le lire
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
  
  return response;
}
```

---

### 4. Injection SQL potentielle dans SQLite adapter
**Sévérité**: 🟡 **IMPORTANT**  
**Fichier**: `src/lib/db/sqlite.ts:164-175`

**Problème**:
```typescript
if (search) {
  query += ' WHERE username LIKE ?';
  countQuery += ' WHERE username LIKE ?';
  params.push(`%${search}%`); // ✅ Paramétrisé, OK
}
```

**Statut**: ✅ **Actuellement sécurisé** (utilisation de requêtes paramétrées)

**Attention**: Les trois adapters (SQLite, Supabase, Neon) utilisent tous des requêtes paramétrées. **Bien fait**.

---

### 5. Pas de rate limiting sur le login
**Sévérité**: 🟡 **IMPORTANT**  
**Fichier**: `src/app/api/auth/login/route.ts`

**Problème**:
- Pas de limitation du nombre de tentatives de connexion
- Vulnérable aux attaques par force brute

**Impact**:
- Un attaquant peut essayer des milliers de combinaisons username/password

**Solution**:
Implémenter un rate limiter simple:
```typescript
// lib/rate-limiter.ts
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt || attempt.resetAt < now) {
    loginAttempts.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (attempt.count >= maxAttempts) {
    return false; // Bloqué
  }
  
  attempt.count++;
  return true;
}
```

Utiliser dans login:
```typescript
const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
if (!checkRateLimit(`login:${clientIp}:${username}`, 5, 15 * 60 * 1000)) {
  return NextResponse.json(
    { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
    { status: 429 }
  );
}
```

---

### 6. Variables d'environnement non validées au démarrage
**Sévérité**: 🟡 **IMPORTANT**  
**Fichiers**: Multiple

**Problème**:
- Les variables critiques (`BACKEND_SERVICE_TOKEN`, `DATABASE_URL`) ne sont validées qu'à l'utilisation
- Pas de validation au démarrage de l'application

**Solution**:
Créer un fichier de validation:
```typescript
// lib/env.ts
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'BACKEND_SERVICE_TOKEN',
  'JWT_SECRET', // À ajouter
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file.'
    );
  }
  
  // Valider le format
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
}

// Appeler au démarrage dans app/layout.tsx ou middleware
```

---

## 🟡 Problèmes d'architecture

### 1. Pattern d'adaptateurs bien implémenté ✅
**Évaluation**: 🟢 **Bien**

Le système multi-DB (SQLite/Neon/Supabase) avec l'interface `DatabaseAdapter` est une **bonne pratique**:
- Séparation des préoccupations
- Facilite les tests
- Permet de changer de DB sans toucher la logique métier

```typescript
// src/lib/db/index.ts
export function getDatabase(): DatabaseAdapter {
  const dbType = process.env.DATABASE_TYPE || 
    (process.env.NODE_ENV === 'production' ? 'neon' : 'sqlite');
  // ...
}
```

**Recommandation**: Garder ce pattern, c'est excellent.

---

### 2. Duplication entre `ApiClient` et `MonPetitBizDatabase`
**Sévérité**: 🟡 **Amélioration recommandée**

**Observation**:
- `ApiClient` (client-side) et `MonPetitBizDatabase` (server-side) font tous deux des appels HTTP
- Certaines méthodes sont dupliquées avec des logiques similaires

**Impact**: Maintenance difficile, risque de divergence

**Solution**:
Créer un client HTTP partagé côté serveur:
```typescript
// lib/backend-client.ts
export class BackendHttpClient {
  constructor(private baseUrl: string, private serviceToken: string) {}
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.serviceToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new BackendError(response.status, await response.text());
    }
    
    return response.json();
  }
}
```

---

### 3. Logique métier dans les routes API
**Sévérité**: 🟡 **Amélioration recommandée**

**Observation**:
Les routes API contiennent de la logique métier directement:
```typescript
// src/app/api/users/route.ts
const existingUser = await db.getUserByUsername(username);
if (existingUser) {
  return NextResponse.json(
    { success: false, message: 'Username already exists' },
    { status: 409 }
  );
}
```

**Solution**:
Extraire dans des services:
```typescript
// lib/services/user-service.ts
export class UserService {
  constructor(private db: DatabaseAdapter) {}
  
  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.db.getUserByUsername(input.username);
    if (existing) {
      throw new ConflictError('Username already exists');
    }
    return this.db.createUser(input);
  }
}

// Dans la route
const userService = new UserService(getDatabase());
const user = await userService.createUser({ username, password, role });
```

---

### 4. Inline styles au lieu de CSS modules
**Sévérité**: 🟢 **Cosmétique**

**Observation**:
Tous les composants utilisent des inline styles:
```tsx
<div style={{ display: 'flex', minHeight: '100vh' }}>
```

**Impact**: 
- Code verbose
- Difficile à maintenir
- Pas de réutilisation
- Pas de classes utilitaires

**Solution**:
1. **Option 1**: Migrer vers Tailwind CSS (recommandé pour Next.js)
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

2. **Option 2**: CSS Modules
```css
/* AdminLayout.module.css */
.container {
  display: flex;
  min-height: 100vh;
}
```

---

## 🟢 Points positifs

### 1. TypeScript strict activé ✅
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```
Excellente pratique pour la qualité du code.

---

### 2. Headers de sécurité HTTP ✅
```javascript
// next.config.js
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
    ],
  }];
}
```
**Manque**: Content-Security-Policy (CSP). Recommandé d'ajouter.

---

### 3. Gestion des erreurs cohérente ✅
Les routes API retournent toutes un format cohérent:
```typescript
{
  success: boolean;
  data?: any;
  message?: string;
}
```

---

### 4. Documentation complète ✅
- README bien structuré
- Guide de configuration multi-DB
- Documentation de l'intégration backend
- Fichier `.env.example` documenté

---

## 🔴 Problèmes de qualité

### 1. Aucun test ❌
**Sévérité**: 🔴 **BLOQUANT pour production**

**Impact**:
- Pas de filet de sécurité lors des modifications
- Régressions non détectées
- Difficile de refactorer en toute confiance

**Solution**:
Ajouter Jest + React Testing Library:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

**Tests prioritaires**:
1. **Tests d'authentification**:
   - Login avec credentials valides
   - Login avec credentials invalides
   - Gestion de session
   - Vérification des rôles

2. **Tests des adapters DB**:
   - CRUD utilisateurs
   - Pagination
   - Recherche

3. **Tests des routes API**:
   - Authentification requise
   - Validation des entrées
   - Gestion des erreurs

Exemple:
```typescript
// __tests__/api/auth/login.test.ts
describe('POST /api/auth/login', () => {
  it('should return 401 with invalid credentials', async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'invalid', password: 'wrong' }),
    });
    expect(response.status).toBe(401);
  });
});
```

---

### 2. Pas de linting ESLint configuré
**Sévérité**: 🟡 **Amélioration**

**État actuel**: `eslint-config-next` installé mais probablement pas de configuration personnalisée

**Solution**:
Ajouter un `.eslintrc.json` strict:
```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

### 3. Utilisation de `any` dans le code
**Sévérité**: 🟡 **Amélioration**

**Exemples**:
```typescript
// src/lib/monpetitbiz-db.ts:128
} catch (error: any) {
  if (error.message.includes('Backend API error')) {
```

**Solution**: Créer des types d'erreur personnalisés:
```typescript
export class BackendApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'BackendApiError';
  }
}

// Utilisation
} catch (error) {
  if (error instanceof BackendApiError) {
    // Gestion typée
  }
}
```

---

### 4. Pas de logger structuré
**Sévérité**: 🟡 **Amélioration**

**Problème**: `console.log` / `console.error` partout

**Solution**: Implémenter un logger:
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty' }
  })
});

// Utilisation
logger.error({ err, userId }, 'Failed to create user');
```

---

## 📊 Analyse des dépendances

### Dépendances à jour ✅
Les versions dans `package.json` sont raisonnables, mais **node_modules est manquant**.

**Action immédiate**: 
```bash
npm install
```

### Versions obsolètes détectées
| Package | Actuel | Recommandé | Raison |
|---------|--------|------------|--------|
| `next` | 14.0.0 | 14.2.35 | Correctifs de sécurité |
| `react` | 18.2.0 | 18.3.1 | Stabilité |
| `react-dom` | 18.2.0 | 18.3.1 | Stabilité |

**Action**:
```bash
npm update next react react-dom
```

**Note**: React 19 et Next.js 16 sont disponibles mais peuvent nécessiter des ajustements.

---

### Dépendances manquantes recommandées

| Package | Raison |
|---------|--------|
| `jsonwebtoken` | Pour JWT sécurisé (CRITIQUE) |
| `@types/jsonwebtoken` | Types TypeScript |
| `zod` | Validation runtime des entrées |
| `pino` | Logger structuré production-ready |
| `jest` | Framework de tests |
| `@testing-library/react` | Tests composants |

---

## 🚀 Recommandations prioritaires

### Priorité 🔴 CRITIQUE (Avant toute production)

1. **Implémenter JWT signé pour les sessions** (Jour 1)
   - Remplacer base64 par JWT avec signature
   - Ajouter `JWT_SECRET` dans les variables d'environnement
   - Valider et vérifier les tokens systématiquement

2. **Ajouter rate limiting sur le login** (Jour 1)
   - Limiter à 5 tentatives / 15 minutes par IP
   - Logger les tentatives excessives

3. **Écrire les tests de sécurité** (Jour 2-3)
   - Tests d'authentification
   - Tests de contrôle d'accès (admin vs manager)
   - Tests d'injection SQL (validation que les paramètres fonctionnent)

4. **Audit de sécurité externe** (Avant production)
   - Faire auditer par un expert sécurité externe
   - Pen-test sur l'authentification

---

### Priorité 🟡 IMPORTANT (Semaine 1-2)

5. **Clarifier l'architecture d'authentification**
   - Documenter qui utilise quel token
   - Séparer clairement client-side vs server-side auth

6. **Implémenter CSRF protection**
   - Tokens CSRF pour toutes les mutations
   - Validation systématique

7. **Ajouter validation runtime avec Zod**
   - Valider tous les inputs API
   - Schémas réutilisables

8. **Implémenter un logger structuré**
   - Pino ou Winston
   - Logs JSON en production

---

### Priorité 🟢 AMÉLIORATION (Semaine 3-4)

9. **Refactoring: Extraire la logique métier**
   - Créer des services (UserService, BusinessService)
   - Routes API deviennent des "controllers" minces

10. **Migration vers Tailwind CSS**
    - Remplacer les inline styles
    - Améliorer la cohérence visuelle

11. **Monitoring et observabilité**
    - Intégrer Sentry ou équivalent pour les erreurs
    - Métriques de performance
    - Health check endpoint (`/api/health`)

12. **CI/CD Pipeline**
    - GitHub Actions ou équivalent
    - Lint + TypeCheck + Tests sur chaque PR
    - Déploiement automatique

---

## 📋 Checklist avant production

- [ ] JWT signé implémenté et testé
- [ ] Rate limiting actif sur login
- [ ] CSRF protection activée
- [ ] Tests de sécurité écrits et qui passent
- [ ] Variables d'environnement validées au démarrage
- [ ] Audit de sécurité externe réalisé
- [ ] Logs structurés en production
- [ ] Monitoring d'erreurs actif (Sentry, etc.)
- [ ] Documentation à jour
- [ ] Procédure de rollback testée
- [ ] Backups de base de données configurés
- [ ] SSL/TLS activé
- [ ] Headers CSP configurés

---

## 🎯 Conclusion

Le projet MonPetitBiz Admin Portal présente une **architecture solide** avec de bonnes pratiques (TypeScript strict, pattern Adapter, documentation). Cependant, les **vulnérabilités de sécurité critiques** autour de l'authentification rendent le projet **non déployable en production** dans son état actuel.

**Effort estimé pour correction critique**: 2-3 jours développeur
**Effort estimé pour amélioration complète**: 2-3 semaines développeur

### Actions immédiates
1. ✅ Lire ce rapport en équipe
2. 🔴 Créer un plan d'action pour les items critiques
3. 🔴 Ne PAS déployer en production sans corrections
4. 🟡 Prioriser les tests et la sécurité pour la suite

---

**Contact**: Fabrice Ilboudo — Ilboudo Technologies Inc.  
**Email**: fabrice@ilboudotechnologies.ca  
**Date du rapport**: 12 mai 2026
