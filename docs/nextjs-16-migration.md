# Migration Next.js 14 → 16 - Rapport de mise à jour de sécurité

**Date**: 12 mai 2026  
**Objectif**: Corriger toutes les vulnérabilités npm critiques et modérées  
**Statut**: ✅ Complétée avec succès

---

## Résumé exécutif

La migration de Next.js 14.2.35 vers 16.2.6 a été effectuée avec succès pour corriger **5 vulnérabilités de sécurité** (1 modérée, 4 high) détectées par `npm audit`. Toutes les vulnérabilités sont maintenant résolues.

### Résultat de l'audit npm
- **Avant**: 5 vulnérabilités (1 modérée, 4 high)
- **Après**: 0 vulnérabilité
- **Tests**: 68 tests passent (100%)
- **Build**: ✅ Réussi

---

## Vulnérabilités corrigées

### 1. Next.js - Multiples vulnérabilités high

**Avant**: Next.js 14.2.35  
**Après**: Next.js 16.2.6

#### Vulnérabilités corrigées:
1. **DoS via Image Optimizer** (GHSA-9g9p-9gw9-jx7f)
   - Impact: Applications auto-hébergées vulnérables au DoS via la configuration remotePatterns de l'optimiseur d'images
   
2. **DoS via React Server Components** (GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj)
   - Impact: Désérialisation de requêtes HTTP et composants serveur insécurisés peuvent mener à des DoS
   
3. **HTTP Request Smuggling** (GHSA-ggv3-7p47-pfv8)
   - Impact: Contrebande de requêtes HTTP dans les rewrites
   
4. **Disk Cache Growth** (GHSA-3x4c-7xq6-9pq8)
   - Impact: Croissance non bornée du cache disque de next/image peut épuiser le stockage
   
5. **XSS via CSP nonces** (GHSA-ffhc-5mcf-pf4q)
   - Impact: Cross-site scripting dans les applications App Router utilisant des nonces CSP
   
6. **Cache Poisoning** (GHSA-vfv6-92ff-j949, GHSA-wfc6-r584-vfw7)
   - Impact: Empoisonnement du cache via des collisions dans le cache-busting des composants serveur React
   
7. **XSS dans beforeInteractive scripts** (GHSA-gx5p-jg67-6x7h)
   - Impact: Cross-site scripting dans les scripts beforeInteractive avec input non fiable
   
8. **DoS dans Image Optimization API** (GHSA-h64f-5h5j-jqjh)
   - Impact: Déni de service dans l'API d'optimisation d'images
   
9. **SSRF via WebSocket upgrades** (GHSA-c4j6-fc7j-m34r)
   - Impact: Falsification de requêtes côté serveur dans les applications utilisant les upgrades WebSocket
   
10. **Middleware/Proxy bypass** (GHSA-36qx-fr4f-26g5, GHSA-3g8h-86w9-wvmq)
    - Impact: Contournement du middleware/proxy dans les applications Pages Router utilisant i18n, et empoisonnement du cache des redirections

### 2. PostCSS - XSS via unescaped `</style>`

**Avant**: PostCSS 8.4.31 (dépendance de Next.js)  
**Après**: PostCSS >= 8.5.10 (forcé via npm overrides)

**Vulnérabilité**: GHSA-qx2v-qp2m-jg93  
**Impact**: XSS via balise `</style>` non échappée dans la sortie CSS Stringify de PostCSS

### 3. glob - Command injection

**Avant**: glob 10.2.0-10.4.5 (dépendance transitive)  
**Après**: Résolu via mise à jour de eslint-config-next 16.2.6

**Vulnérabilité**: GHSA-5j98-mcp5-4vw2  
**Impact**: Injection de commande via `-c/--cmd` exécute les correspondances avec `shell:true`

### 4. ESLint - Mise à jour majeure

**Avant**: ESLint 8.57.1  
**Après**: ESLint 9.39.4

Next.js 16 requiert ESLint 9+ pour `eslint-config-next@16`.

---

## Modifications techniques

### 1. Dépendances mises à jour

```json
{
  "dependencies": {
    "next": "^16.2.6",
    "react": "^19.2.6",
    "react-dom": "^19.2.6"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "eslint": "^9.39.4",
    "eslint-config-next": "^16.2.6"
  },
  "overrides": {
    "postcss": ">=8.5.10"
  }
}
```

### 2. Breaking Changes - Next.js 15/16

#### 2.1. Route Handlers: `params` est maintenant une Promise

**Avant (Next.js 14)**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params; // ❌ Synchrone
}
```

**Après (Next.js 16)**:
```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ Async
}
```

**Fichiers modifiés** (13 route handlers):
- `src/app/api/backend/businesses/[id]/products/[productId]/route.ts`
- `src/app/api/backend/businesses/[id]/products/route.ts`
- `src/app/api/backend/businesses/[id]/products/upload/route.ts`
- `src/app/api/backend/businesses/[id]/route.ts`
- `src/app/api/backend/dashboard/[businessId]/chart-data/route.ts`
- `src/app/api/backend/dashboard/[businessId]/export/route.ts`
- `src/app/api/backend/dashboard/[businessId]/metrics/route.ts`
- `src/app/api/backend/dashboard/[businessId]/recent-transactions/route.ts`
- `src/app/api/backend/dashboard/[businessId]/route.ts`
- `src/app/api/backend/dashboard/[businessId]/stock-warnings/route.ts`
- `src/app/api/backend/dashboard/[businessId]/summary/route.ts`
- `src/app/api/users/[id]/route.ts`

**Script de migration automatique**: `scripts/fix-nextjs16-params.js`

#### 2.2. Middleware → Proxy

Next.js 16 déprécié la convention `middleware.ts` en faveur de `proxy.ts`.

**Changements**:
1. Fichier renommé: `src/middleware.ts` → `src/proxy.ts`
2. Fonction exportée renommée: `middleware` → `proxy` (default export)

**Avant**:
```typescript
export function middleware(request: NextRequest) {
  // ...
}
```

**Après**:
```typescript
export default function proxy(request: NextRequest) {
  // ...
}
```

### 3. PostCSS Override

Pour forcer une version sécurisée de PostCSS (>= 8.5.10) même si Next.js embarque une version plus ancienne dans ses dépendances internes, nous avons utilisé `npm overrides`:

```json
{
  "overrides": {
    "postcss": ">=8.5.10"
  }
}
```

---

## Procédure de migration appliquée

### Étape 1: Création d'une branche de sécurité
```bash
git checkout -b upgrade-nextjs-16-security
```

### Étape 2: Mise à jour des dépendances principales
```bash
npm install next@16.2.6 eslint@9 eslint-config-next@16.2.6 \\
  react@19 react-dom@19 @types/react@19 @types/react-dom@19 \\
  --legacy-peer-deps
```

### Étape 3: Ajout des overrides PostCSS
Modification de `package.json` pour ajouter la section `overrides`.

### Étape 4: Réinstallation avec overrides
```bash
npm install --legacy-peer-deps
```

### Étape 5: Correction des breaking changes
1. Exécution du script de migration pour les route handlers avec params
2. Renommage de `middleware.ts` en `proxy.ts`
3. Renommage de l'export `middleware` en `proxy`

### Étape 6: Validation
```bash
npm audit                    # ✅ 0 vulnerabilities
npm run type-check           # ✅ No errors
npm run test                 # ✅ 68/68 tests passed
npm run build                # ✅ Build succeeded
```

---

## Impact sur l'application

### ✅ Pas d'impact négatif
- Tous les tests de sécurité passent (68/68)
- Le TypeScript compile sans erreur
- Le build de production réussit
- Aucune régression fonctionnelle détectée

### ⚠️ Avertissements mineurs
Un avertissement Turbopack concernant le workspace root apparaît:
```
⚠ Warning: Next.js inferred your workspace root, but it may not be correct.
```

**Solution** (optionnelle): Ajouter dans `next.config.js`:
```javascript
turbopack: {
  root: __dirname
}
```

---

## Recommandations

### 1. Tests en environnement de staging
Avant de déployer en production, tester l'application dans un environnement de staging similaire à la production pour valider:
- Le comportement des API routes avec les nouveaux params async
- Le proxy CSRF fonctionne correctement
- Les images sont optimisées sans erreur
- Les composants serveur React fonctionnent comme attendu

### 2. Monitoring post-déploiement
Surveiller attentivement après le déploiement:
- Les logs d'erreur côté serveur
- Les performances de l'Image Optimizer
- Le comportement du cache Next.js
- Les métriques de sécurité (tentatives CSRF, rate limiting)

### 3. Documentation d'équipe
Informer l'équipe des breaking changes, notamment:
- Les `params` sont maintenant async dans tous les route handlers
- Le fichier `middleware.ts` est maintenant `proxy.ts`
- React 19 introduit de nouveaux hooks et comportements

---

## Ressources

### Documentation officielle Next.js
- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Middleware to Proxy Migration](https://nextjs.org/docs/messages/middleware-to-proxy)
- [Async Request APIs](https://nextjs.org/docs/messages/sync-dynamic-apis)

### Advisories de sécurité
- [Next.js Security Advisories](https://github.com/vercel/next.js/security/advisories)
- [PostCSS Advisory GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)

---

## Vérification finale

```bash
# Audit de sécurité
$ npm audit
found 0 vulnerabilities

# Tests
$ npm test
Test Suites: 4 passed, 4 total
Tests:       68 passed, 68 total

# Type checking
$ npm run type-check
✓ No TypeScript errors

# Build
$ npm run build
✓ Compiled successfully
```

---

**Migration effectuée par**: Agent Claude  
**Date de complétion**: 12 mai 2026  
**Branche**: `upgrade-nextjs-16-security`  
**Prochaine étape**: Merge vers `develop` après validation en staging
