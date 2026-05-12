# Déploiement sur Vercel - Guide complet

Ce guide explique comment déployer le **MonPetitBiz Admin Portal** sur Vercel.

---

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir:

1. ✅ Un compte [Vercel](https://vercel.com) (gratuit pour commencer)
2. ✅ Un compte [Neon](https://neon.tech) avec une base de données PostgreSQL configurée
3. ✅ Le backend MonPetitBiz API déployé et accessible
4. ✅ Les variables d'environnement suivantes prêtes:
   - `NEXT_PUBLIC_API_URL` - URL de votre backend API
   - `BACKEND_SERVICE_TOKEN` - Token de service backend
   - `JWT_SECRET` - Secret pour les tokens JWT
   - `DATABASE_TYPE` - Type de base de données (neon)
   - `DATABASE_URL` - Connection string Neon PostgreSQL

---

## 🚀 Méthode 1: Déploiement via Vercel Dashboard (Recommandé)

### Étape 1: Préparer le projet

```bash
# S'assurer que tout est commité
git status
git add .
git commit -m "chore: prepare for Vercel deployment"
git push origin develop
```

### Étape 2: Importer le projet dans Vercel

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. Connectez votre compte GitHub/GitLab/Bitbucket
3. Sélectionnez le repository `monpetitbiz-admin-portal`
4. Configurez le projet:
   - **Framework Preset**: Next.js (détecté automatiquement)
   - **Root Directory**: `./` (racine)
   - **Build Command**: `npm run build` (par défaut)
   - **Output Directory**: `.next` (par défaut)
   - **Install Command**: `npm install` (par défaut)

### Étape 3: Configurer les variables d'environnement

Dans l'onglet "Environment Variables", ajoutez:

#### Variables pour Production

```bash
# API Backend
NEXT_PUBLIC_API_URL=https://api.monpetitbiz.com

# Backend Service
BACKEND_SERVICE_TOKEN=votre_token_backend_production

# JWT Secret (GÉNÉRER UN NOUVEAU POUR LA PRODUCTION!)
JWT_SECRET=nouveau_secret_genere_pour_production

# Database Neon
DATABASE_TYPE=neon
DATABASE_URL=postgresql://user:password@host.neon.tech/db?sslmode=require
```

**🔐 IMPORTANT**: Ne réutilisez JAMAIS les secrets de développement en production!

#### Générer un nouveau JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Étape 4: Déployer

1. Cliquez sur **"Deploy"**
2. Attendez que le build se termine (2-3 minutes)
3. Votre application sera disponible sur `https://votre-projet.vercel.app`

---

## 🚀 Méthode 2: Déploiement via Vercel CLI

### Installation de Vercel CLI

```bash
npm install -g vercel
```

### Déploiement

```bash
# Se connecter à Vercel
vercel login

# Déployer en preview (première fois)
vercel

# Répondre aux questions:
# - Set up and deploy? Yes
# - Which scope? Votre compte
# - Link to existing project? No
# - Project name? monpetitbiz-admin-portal
# - Directory? ./
# - Override settings? No

# Configurer les variables d'environnement
vercel env add NEXT_PUBLIC_API_URL production
vercel env add BACKEND_SERVICE_TOKEN production
vercel env add JWT_SECRET production
vercel env add DATABASE_TYPE production
vercel env add DATABASE_URL production

# Déployer en production
vercel --prod
```

---

## 🔧 Configuration Vercel (vercel.json)

Le fichier `vercel.json` est déjà configuré avec:

```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "src/app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Options de configuration

- **regions**: `["iad1"]` (us-east-1) - Rapprocher de votre base Neon
- **memory**: 1024 MB pour les API routes
- **maxDuration**: 10 secondes max pour les fonctions serverless

---

## 🗄️ Configuration Base de données Neon

### 1. Créer une base de données Neon (si pas déjà fait)

1. Allez sur [console.neon.tech](https://console.neon.tech)
2. Créez un nouveau projet
3. Notez la connection string:
   ```
   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/db?sslmode=require
   ```

### 2. Exécuter les migrations

1. Dans le dashboard Neon, allez dans "SQL Editor"
2. Exécutez le script `docs/neon-migration.sql`:

```sql
-- Créer la table users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
  "businessId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_businessId ON users("businessId");
```

### 3. Créer un utilisateur admin initial

Option 1: Via le script de seed localement (avec DATABASE_URL configuré):

```bash
npm run seed:admin admin VotreMotDePasse123!
```

Option 2: Directement dans Neon SQL Editor:

```sql
-- Générez d'abord un hash bcrypt de votre mot de passe
-- Utilisez: https://bcrypt-generator.com/ avec cost 10
INSERT INTO users (id, username, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  '$2a$10$...votre_hash_bcrypt_ici',
  'admin',
  NOW(),
  NOW()
);
```

---

## 🌍 Configuration du domaine personnalisé

### Ajouter un domaine

1. Dans le dashboard Vercel, allez dans **Settings > Domains**
2. Ajoutez votre domaine: `admin.monpetitbiz.com`
3. Configurez les DNS chez votre registrar:

```
Type: CNAME
Name: admin
Value: cname.vercel-dns.com
```

4. Attendez la propagation DNS (1-48h)
5. Vercel provisionne automatiquement le certificat SSL

---

## 🔐 Variables d'environnement par environnement

Vercel supporte 3 environnements:

### Production
```bash
NEXT_PUBLIC_API_URL=https://api.monpetitbiz.com
BACKEND_SERVICE_TOKEN=token_prod_xyz123
JWT_SECRET=secret_prod_abc456
DATABASE_TYPE=neon
DATABASE_URL=postgresql://prod_user:pass@prod.neon.tech/prod_db
```

### Preview (branches de feature)
```bash
NEXT_PUBLIC_API_URL=https://api-staging.monpetitbiz.com
BACKEND_SERVICE_TOKEN=token_staging_xyz123
JWT_SECRET=secret_staging_abc456
DATABASE_TYPE=neon
DATABASE_URL=postgresql://staging_user:pass@staging.neon.tech/staging_db
```

### Development (local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:9000
BACKEND_SERVICE_TOKEN=token_dev_xyz123
JWT_SECRET=secret_dev_abc456
DATABASE_TYPE=sqlite
```

---

## 🔄 Déploiement continu (CI/CD)

Vercel déploie automatiquement:

- ✅ **Chaque commit sur `main`/`master`** → Production
- ✅ **Chaque commit sur autres branches** → Preview deployment
- ✅ **Chaque Pull Request** → Preview deployment unique

### Configuration des branches

Dans **Settings > Git**:

- **Production Branch**: `main` ou `develop`
- **Deploy Hooks**: Configurez des webhooks si besoin

---

## 📊 Monitoring et logs

### Voir les logs

```bash
# Logs en temps réel
vercel logs

# Logs d'une fonction spécifique
vercel logs --follow
```

### Dashboard Vercel

- **Deployments**: Historique de tous les déploiements
- **Analytics**: Trafic, performances, erreurs
- **Speed Insights**: Core Web Vitals
- **Logs**: Logs en temps réel des fonctions serverless

---

## 🐛 Troubleshooting

### Build échoue

**Erreur**: `Type error: ...`
```bash
# Vérifier TypeScript localement
npm run type-check

# Build localement
npm run build
```

**Erreur**: `Module not found`
```bash
# Vérifier les dépendances
npm install
npm audit fix
```

### Variables d'environnement manquantes

**Erreur**: `JWT_SECRET is not set`

1. Allez dans **Settings > Environment Variables**
2. Ajoutez la variable manquante
3. **Redéployez** (important!)

```bash
vercel --prod
```

### Database connection failed

**Erreur**: `Failed to create Neon client`

1. Vérifiez que `DATABASE_URL` est correct
2. Vérifiez que Neon autorise les connexions depuis Vercel
3. Testez la connection string localement:

```bash
DATABASE_URL="postgresql://..." npm run dev
```

### Rate Limiting

Si vous dépassez les limites Vercel (gratuit):

- **100 GB/month bandwidth**
- **100 deployments/day**
- **Serverless Function Execution**: 100 GB-hours

**Solution**: Passez à Vercel Pro ($20/mois)

---

## ✅ Checklist de déploiement

### Avant le déploiement

- [ ] ✅ Tous les tests passent (`npm test`)
- [ ] ✅ Build réussit localement (`npm run build`)
- [ ] ✅ Variables d'environnement préparées
- [ ] ✅ Base de données Neon configurée et migrée
- [ ] ✅ Backend API accessible publiquement
- [ ] ✅ JWT_SECRET unique généré pour production
- [ ] ✅ Tous les changements sont commités

### Après le déploiement

- [ ] ✅ Application accessible sur l'URL Vercel
- [ ] ✅ Login fonctionne avec utilisateur admin
- [ ] ✅ Dashboard charge correctement
- [ ] ✅ API routes fonctionnent
- [ ] ✅ CSRF protection active
- [ ] ✅ Logs de sécurité visibles dans Vercel
- [ ] ✅ Domaine personnalisé configuré (optionnel)
- [ ] ✅ SSL/HTTPS actif

---

## 🔗 Ressources

### Documentation officielle
- [Vercel Next.js Deployment](https://vercel.com/docs/frameworks/nextjs)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Neon Serverless Driver](https://neon.tech/docs/serverless/serverless-driver)

### Commandes utiles

```bash
# Voir les déploiements
vercel ls

# Voir les variables d'environnement
vercel env ls

# Promouvoir un preview en production
vercel promote <deployment-url>

# Rollback vers un déploiement précédent
vercel rollback

# Voir les logs
vercel logs --follow

# Supprimer un déploiement
vercel rm <deployment-url>
```

---

## 💰 Coûts estimés

### Configuration recommandée

| Service | Plan | Coût mensuel |
|---------|------|--------------|
| **Vercel** | Hobby (gratuit) ou Pro | $0 - $20/mois |
| **Neon** | Free tier | $0/mois |
| **Total** | | **$0 - $20/mois** |

### Limites Free tier

**Vercel Hobby** (gratuit):
- ✅ Bandwidth: 100 GB/mois
- ✅ Builds: 6000 minutes/mois
- ✅ Serverless Functions: 100 GB-hours
- ✅ Edge Functions: 500k invocations
- ✅ Domaines personnalisés: Illimités
- ✅ SSL automatique

**Neon Free tier**:
- ✅ 512 MB storage
- ✅ 1 project
- ✅ 10 branches
- ✅ 100 heures compute/mois

Pour un admin portal avec trafic modéré, **le tier gratuit est suffisant**.

---

## 🎯 Prochaines étapes

1. ✅ Déployer sur Vercel
2. ✅ Configurer le domaine personnalisé
3. ✅ Mettre en place le monitoring
4. ✅ Configurer les alertes (Vercel Integrations)
5. ✅ Ajouter Analytics (Vercel Analytics)
6. ✅ Configurer un backup automatique de Neon

---

**Besoin d'aide?** Consultez la [documentation Vercel](https://vercel.com/docs) ou ouvrez une issue sur GitHub.
