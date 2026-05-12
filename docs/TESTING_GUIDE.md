# Guide de Test — Corrections de Sécurité

**Date**: 12 mai 2026  
**Version**: 1.0.0

---

## Tests Manuels Rapides

### ✅ Test 1: Validation d'Environnement

**Objectif**: Vérifier que les variables d'environnement sont validées au démarrage

**Étapes**:
```bash
# 1. Démarrer le serveur
npm run dev

# 2. Vérifier les logs de la console
# Vous devriez voir: ✅ Environment validation passed
```

**Résultat attendu**:
- ✅ Message "✅ Environment validation passed" visible
- ✅ Serveur démarre sur http://localhost:3000

**Test de l'échec** (optionnel):
```bash
# 1. Renommer .env.local temporairement
mv .env.local .env.local.backup

# 2. Démarrer le serveur
npm run dev

# 3. Résultat attendu: Erreur claire indiquant les variables manquantes
# "❌ Environment validation failed: JWT_SECRET is not set"

# 4. Restaurer le fichier
mv .env.local.backup .env.local
```

---

### ✅ Test 2: JWT Signé

**Objectif**: Vérifier que les tokens de session sont des JWT signés et sécurisés

**Étapes**:

1. **Démarrer l'application**:
```bash
npm run dev
```

2. **Se connecter**:
   - Aller sur http://localhost:3000/login
   - Entrer un username et mot de passe valide
   - Se connecter

3. **Vérifier le token**:
   - Ouvrir DevTools (F12) > Application > Cookies
   - Trouver le cookie `session_token`
   - **Format attendu**: `xxx.yyy.zzz` (3 parties séparées par des points)
   - **Exemple**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ...`

4. **Test de sécurité - Modifier le token**:
   - Double-cliquer sur la valeur du cookie
   - Changer quelques caractères (par exemple, remplacer 'a' par 'b')
   - Sauvegarder
   - Recharger la page (F5)
   - **Résultat attendu**: Vous êtes redirigé vers /login (session invalide)

5. **Test de sécurité - Token expiré**:
   - Dans DevTools > Console, exécuter:
   ```javascript
   // Créer un token expiré manuellement (nécessite d'avoir jsonwebtoken en devtools)
   // Ou attendre 7 jours pour que le token expire naturellement
   ```

**Résultats attendus**:
- ✅ Token est un JWT (format xxx.yyy.zzz)
- ✅ Token modifié = session rejetée
- ✅ Token expiré = session rejetée
- ✅ Cookie est httpOnly (non modifiable via JavaScript)
- ✅ Cookie est Secure en production

---

### ✅ Test 3: Rate Limiting

**Objectif**: Vérifier que le rate limiting bloque les tentatives excessives

**Étapes**:

1. **Démarrer l'application**:
```bash
npm run dev
```

2. **Tenter des connexions échouées**:
   - Aller sur http://localhost:3000/login
   - Entrer un username (ex: "admin")
   - Entrer un mauvais mot de passe
   - Cliquer sur "Se connecter"
   - **Répéter 5 fois**

3. **6ème tentative**:
   - Essayer de se connecter une 6ème fois
   - **Résultat attendu**:
     - Message d'erreur: "Too many login attempts. Please try again in 15 minutes."
     - Le bouton devrait être désactivé ou l'erreur claire

4. **Vérifier dans la console du serveur**:
   - Chercher les logs de rate limiting
   - Vous devriez voir: `⚠️ Security Event [rate_limit_exceeded]`

5. **Test de reset après succès**:
   - Attendre 15 minutes (OU modifier le délai dans `src/lib/rate-limiter.ts` à 1 minute pour tester)
   - Se connecter avec les bons identifiants
   - **Résultat attendu**: Le compteur est réinitialisé

**Résultats attendus**:
- ✅ 5 tentatives autorisées
- ✅ 6ème tentative bloquée avec message clair
- ✅ Status HTTP 429 (Too Many Requests)
- ✅ Reset après 15 minutes
- ✅ Reset immédiat après login réussi

---

### ✅ Test 4: Logging de Sécurité

**Objectif**: Vérifier que les événements de sécurité sont loggés

**Étapes**:

1. **Démarrer l'application en dev**:
```bash
npm run dev
```

2. **Générer des événements**:
   - Login échoué: Essayer de se connecter avec un mauvais mot de passe
   - Login réussi: Se connecter avec les bons identifiants
   - Rate limiting: Faire 6 tentatives échouées

3. **Vérifier les logs dans la console**:
   - Chercher les emojis de sécurité:
     - 🔴 `login_failed`
     - ✅ `login_success`
     - ⚠️ `rate_limit_exceeded`

4. **Vérifier les logs sur disque** (si NODE_ENV=production):
```bash
# Vérifier qu'un dossier logs/ a été créé
ls -la logs/

# Lire le fichier de log du jour
cat logs/security-$(date +%Y-%m-%d).log

# Devrait afficher des lignes JSON comme:
# {"type":"login_failed","username":"admin","ip":"::1","timestamp":"2026-05-12T04:00:00.000Z"}
```

**Résultats attendus**:
- ✅ Logs visibles dans la console en dev (avec emojis)
- ✅ Logs écrits dans `logs/security-YYYY-MM-DD.log` en production
- ✅ Format JSON structuré
- ✅ Informations complètes: type, username, IP, timestamp

---

## Tests d'Intégration Complets

### Scénario 1: Nouveau utilisateur qui se connecte

```bash
# 1. Démarrer l'application
npm run dev

# 2. Dans un autre terminal, créer un utilisateur admin
npm run seed:admin testuser password123

# 3. Dans le navigateur:
# - Aller sur http://localhost:3000/login
# - Entrer: testuser / password123
# - Cliquer "Se connecter"

# Résultats attendus:
# ✅ Redirection vers /admin/dashboard (si admin)
# ✅ Cookie session_token créé (JWT valide)
# ✅ Log "✅ login_success" dans la console
```

---

### Scénario 2: Attaquant qui essaie de forcer le login

```bash
# 1. Dans le navigateur, ouvrir DevTools > Network
# 2. Aller sur /login
# 3. Essayer de se connecter 10 fois avec un mauvais mot de passe

# Observer:
# - Tentatives 1-5: Status 401 Unauthorized
# - Tentatives 6-10: Status 429 Too Many Requests
# - Console serveur: Logs de rate_limit_exceeded
# - Fichier logs/security-*.log: Événements enregistrés
```

---

### Scénario 3: Utilisateur malveillant modifie son token

```bash
# 1. Se connecter normalement
# 2. Dans DevTools > Application > Cookies
# 3. Modifier le cookie session_token:
#    - Changer le rôle de "user" à "admin" (nécessite de décoder le JWT)
#    - Ou simplement modifier quelques caractères
# 4. Recharger la page

# Résultats attendus:
# ✅ Token rejeté (signature invalide)
# ✅ Redirection vers /login
# ✅ Log "🔒 invalid_token" dans la console
```

---

## Checklist Avant Production

Avant de déployer en production, vérifier:

- [ ] **JWT_SECRET**:
  - [ ] Généré avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - [ ] Au moins 64 caractères
  - [ ] Différent pour chaque environnement (dev, staging, prod)
  - [ ] Stocké de manière sécurisée (Vercel env, AWS Secrets Manager, etc.)
  - [ ] Jamais commité dans Git

- [ ] **Rate Limiting**:
  - [ ] Tester avec 6+ tentatives échouées
  - [ ] Vérifier le message d'erreur utilisateur
  - [ ] Confirmer le reset après 15 minutes
  - [ ] Considérer Redis pour production à grande échelle

- [ ] **Logging**:
  - [ ] Logs écrits dans le bon emplacement
  - [ ] Format JSON valide
  - [ ] Rotation des fichiers configurée
  - [ ] Intégration avec service de monitoring (Datadog, Sentry, etc.)

- [ ] **Variables d'environnement**:
  - [ ] Toutes les variables requises définies
  - [ ] Validation au démarrage fonctionne
  - [ ] Messages d'erreur clairs

- [ ] **Build de production**:
  - [ ] `npm run build` réussit sans erreur
  - [ ] `npm start` démarre sans erreur
  - [ ] Tester l'authentification en mode production

---

## Commandes Utiles

```bash
# Type checking
npm run type-check

# Build de production
npm run build

# Démarrer en mode production
npm start

# Générer un nouveau JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Créer un utilisateur admin
npm run seed:admin username password

# Nettoyer les logs
rm -rf logs/

# Nettoyer node_modules et réinstaller
rm -rf node_modules package-lock.json
npm install
```

---

## Dépannage

### Erreur: "JWT_SECRET is not configured"

**Solution**:
```bash
# Vérifier que .env.local existe
cat .env.local | grep JWT_SECRET

# Si manquant, générer un nouveau secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ajouter à .env.local
echo "JWT_SECRET=votre_secret_genere" >> .env.local
```

---

### Erreur: "Too many login attempts" même après 15 minutes

**Solution**:
- Le rate limiter est en mémoire, donc se réinitialise au redémarrage du serveur
- En dev, redémarrer le serveur: `Ctrl+C` puis `npm run dev`
- En production, considérer Redis pour persister les limites

---

### Session expire immédiatement

**Vérifications**:
1. Cookie `session_token` est présent ?
2. Cookie a le flag `httpOnly` ?
3. JWT_SECRET est le même au login et à la vérification ?
4. Vérifier les logs: chercher "Invalid JWT token" ou "Expired JWT token"

---

## Support

Pour toute question ou problème:

1. Consulter les logs: `logs/security-*.log`
2. Vérifier la console du serveur
3. Lire le rapport complet: `docs/code-review-report.md`
4. Contacter: fabrice@ilboudotechnologies.ca
