# 🚀 Checklist de déploiement Vercel

Utilisez cette checklist avant chaque déploiement en production.

---

## ✅ Phase 1: Préparation locale

### Code et tests
- [ ] Tous les tests passent: `npm test`
- [ ] Tests de sécurité passent: `npm run test:security`
- [ ] Type checking réussi: `npm run type-check`
- [ ] Lint réussi: `npm run lint`
- [ ] Build local réussi: `npm run build`

### Variables d'environnement
- [ ] JWT_SECRET unique généré pour production
- [ ] BACKEND_SERVICE_TOKEN de production obtenu
- [ ] DATABASE_URL Neon de production configuré
- [ ] NEXT_PUBLIC_API_URL de production vérifié

### Base de données Neon
- [ ] Projet Neon créé
- [ ] Migrations SQL exécutées (`docs/neon-migration.sql`)
- [ ] Utilisateur admin initial créé
- [ ] Connection string testée localement

### Git
- [ ] Tous les changements commités
- [ ] Branch à jour avec `develop` ou `main`
- [ ] Push vers le repository distant
- [ ] Pas de secrets dans le code

---

## ✅ Phase 2: Configuration Vercel

### Projet Vercel
- [ ] Compte Vercel créé
- [ ] Repository importé dans Vercel
- [ ] Framework détecté: Next.js
- [ ] Build settings vérifiés:
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

### Variables d'environnement (Production)
- [ ] `NEXT_PUBLIC_API_URL` ajouté
- [ ] `BACKEND_SERVICE_TOKEN` ajouté
- [ ] `JWT_SECRET` ajouté (NOUVEAU, pas celui de dev!)
- [ ] `DATABASE_TYPE=neon` ajouté
- [ ] `DATABASE_URL` ajouté

### Configuration projet
- [ ] Production Branch configurée (`main` ou `develop`)
- [ ] Auto-deploy activé (optionnel)
- [ ] Build & Development Settings vérifiés

---

## ✅ Phase 3: Premier déploiement

### Build Vercel
- [ ] Déploiement lancé (manuel ou auto)
- [ ] Build logs vérifiés (pas d'erreurs)
- [ ] TypeScript compilation réussie
- [ ] Génération des pages statiques réussie
- [ ] Déploiement terminé avec succès

### URL de déploiement
- [ ] URL Vercel obtenue: `https://votre-projet.vercel.app`
- [ ] Page d'accueil charge correctement
- [ ] Redirect vers `/login` fonctionne

---

## ✅ Phase 4: Tests fonctionnels

### Authentification
- [ ] Page de login accessible
- [ ] Login avec utilisateur admin fonctionne
- [ ] JWT token créé et stocké
- [ ] Session persistante après refresh
- [ ] Logout fonctionne

### Dashboard
- [ ] Dashboard admin charge
- [ ] Sidebar s'affiche correctement
- [ ] Navigation fonctionne
- [ ] Profil utilisateur visible

### API Routes
- [ ] `/api/auth/login` fonctionne
- [ ] `/api/users` fonctionne
- [ ] CSRF token généré dans cookies
- [ ] CSRF validation fonctionne

### Base de données
- [ ] Connexion Neon établie
- [ ] Lecture des users fonctionne
- [ ] Création d'utilisateur fonctionne
- [ ] Mise à jour fonctionne
- [ ] Suppression fonctionne

### Sécurité
- [ ] CSRF protection active
- [ ] JWT validation fonctionne
- [ ] Rate limiting actif (tester 5+ tentatives login)
- [ ] Headers de sécurité présents (F12 > Network)
- [ ] Pas de secrets exposés dans le code client

---

## ✅ Phase 5: Monitoring

### Vercel Dashboard
- [ ] Deployment status: "Ready"
- [ ] Build logs vérifiés (pas d'avertissements critiques)
- [ ] Function logs accessibles
- [ ] Analytics activé (optionnel)

### Logs de sécurité
- [ ] Logs de login visibles dans Vercel Function Logs
- [ ] Tentatives de login échouées loggées
- [ ] Rate limiting events loggés

### Performance
- [ ] Time to First Byte < 500ms
- [ ] Pages chargent en < 2s
- [ ] API routes répondent en < 1s

---

## ✅ Phase 6: Domaine personnalisé (Optionnel)

### Configuration DNS
- [ ] Domaine acheté (ex: `monpetitbiz.com`)
- [ ] Domaine ajouté dans Vercel: `admin.monpetitbiz.com`
- [ ] DNS CNAME configuré:
  ```
  Type: CNAME
  Name: admin
  Value: cname.vercel-dns.com
  ```
- [ ] Propagation DNS vérifiée (24-48h)
- [ ] Certificat SSL provisionné automatiquement
- [ ] HTTPS actif et fonctionnel

---

## ✅ Phase 7: Post-déploiement

### Documentation
- [ ] URL de production documentée
- [ ] Accès admin partagé avec l'équipe
- [ ] Procédure de rollback documentée
- [ ] Contact support configuré

### Backup
- [ ] Backup base de données Neon configuré
- [ ] Procédure de restauration testée

### Monitoring continu
- [ ] Alertes configurées (Vercel Integrations)
- [ ] Monitoring uptime (optionnel: UptimeRobot, etc.)
- [ ] Logs surveillés quotidiennement

### Communication
- [ ] Équipe notifiée du déploiement
- [ ] URL de production communiquée
- [ ] Documentation utilisateur mise à jour

---

## 🔄 Déploiements futurs

Pour les déploiements suivants:

```bash
# 1. Vérifier que les tests passent
npm test

# 2. Commit et push
git add .
git commit -m "feat: nouvelle fonctionnalité"
git push origin develop

# 3. Déployer (si auto-deploy désactivé)
npm run deploy

# 4. Vérifier le déploiement
# - Vercel Dashboard > Deployments
# - Tester les nouvelles fonctionnalités
# - Vérifier les logs
```

---

## 🚨 Rollback en cas de problème

Si le déploiement cause des problèmes:

```bash
# Option 1: Via Dashboard Vercel
# 1. Aller dans Deployments
# 2. Trouver le dernier déploiement stable
# 3. Cliquer sur "..." > "Promote to Production"

# Option 2: Via CLI
vercel rollback
```

---

## 📞 Support

En cas de problème:

1. Vérifier les logs Vercel: `vercel logs --follow`
2. Consulter [`docs/vercel-deployment.md`](./docs/vercel-deployment.md)
3. Vérifier les variables d'environnement Vercel
4. Tester la connexion Neon localement
5. Ouvrir un ticket support Vercel si nécessaire

---

**Dernière mise à jour**: 12 mai 2026
