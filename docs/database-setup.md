# Configuration de la base de données

Ce projet supporte trois types de bases de données :
- **SQLite** : Pour le développement local
- **Neon** : Pour la production (recommandé)
- **Supabase** : Pour la production (support legacy)

## Configuration SQLite (Développement local)

SQLite est utilisé par défaut en développement. Aucune configuration supplémentaire n'est nécessaire.

Le fichier de base de données sera créé automatiquement dans le dossier `data/users.db` lors de la première utilisation.

### Initialisation

1. Assurez-vous que la variable d'environnement `DATABASE_TYPE` est définie à `sqlite` (ou laissez-la non définie en développement)
2. Lancez l'application : `npm run dev`
3. La base de données sera créée automatiquement

### Créer un utilisateur admin initial

Vous pouvez créer un utilisateur admin de deux façons :

**Option 1 : Utiliser le script de seed (recommandé)**

```bash
npm run seed:admin <username> <password>
```

Exemple :
```bash
npm run seed:admin admin monmotdepasse123
```

**Option 2 : Via l'interface web**

Une fois que vous avez créé un premier utilisateur admin, vous pouvez créer d'autres utilisateurs via l'interface web à `/admin/users`.

## Configuration Neon (Production - Recommandé)

### 1. Créer un projet Neon

1. Allez sur [neon.tech](https://neon.tech)
2. Créez un compte ou connectez-vous
3. Créez un nouveau projet
4. Notez la connection string PostgreSQL (elle ressemble à `postgres://user:password@host.neon.tech/database?sslmode=require`)

### 2. Exécuter la migration SQL

1. Ouvrez l'éditeur SQL dans votre projet Neon (via le dashboard Neon)
2. Exécutez le script de migration fourni dans `docs/neon-migration.sql`
3. Vérifiez que la table `users` a été créée

### 3. Configurer les variables d'environnement

Ajoutez les variables suivantes à votre fichier `.env.local` ou à votre plateforme de déploiement :

```bash
DATABASE_TYPE=neon
DATABASE_URL=postgres://user:password@host.neon.tech/database?sslmode=require
```

**Important** : Remplacez la connection string par celle fournie par Neon. Vous pouvez la trouver dans votre dashboard Neon sous "Connection Details".

### 4. Créer un utilisateur admin initial

**Option 1 : Utiliser le script de seed (recommandé)**

Assurez-vous que les variables d'environnement Neon sont configurées, puis exécutez :

```bash
npm run seed:admin <username> <password>
```

Exemple :
```bash
npm run seed:admin admin monmotdepasse123
```

**Option 2 : Via l'éditeur SQL de Neon**

Si vous préférez créer l'utilisateur directement dans Neon, vous devrez hasher le mot de passe avec bcrypt. Utilisez un outil en ligne ou un script Node.js pour générer le hash, puis :

```sql
-- Note: Le mot de passe doit être hashé avec bcrypt
-- Utilisez un outil en ligne ou un script pour générer le hash
INSERT INTO users (id, username, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  '$2a$10$...', -- Remplacez par un hash bcrypt de votre mot de passe
  'admin',
  NOW(),
  NOW()
);
```

**Option 3 : Via l'interface web**

Une fois que vous avez créé un premier utilisateur admin, vous pouvez créer d'autres utilisateurs via l'interface web à `/admin/users`.

## Configuration Supabase (Production - Legacy)

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'URL du projet et la clé anonyme (anon key)

### 2. Exécuter la migration SQL

1. Ouvrez l'éditeur SQL dans votre projet Supabase
2. Exécutez le script de migration fourni dans `docs/supabase-migration.sql`
3. Vérifiez que la table `users` a été créée

### 3. Configurer les variables d'environnement

Ajoutez les variables suivantes à votre fichier `.env.local` ou à votre plateforme de déploiement :

```bash
DATABASE_TYPE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

### 4. Créer un utilisateur admin initial

**Option 1 : Utiliser le script de seed (recommandé)**

Assurez-vous que les variables d'environnement Supabase sont configurées, puis exécutez :

```bash
npm run seed:admin <username> <password>
```

Exemple :
```bash
npm run seed:admin admin monmotdepasse123
```

**Option 2 : Via l'éditeur SQL de Supabase**

Si vous préférez créer l'utilisateur directement dans Supabase, vous devrez hasher le mot de passe avec bcrypt. Utilisez un outil en ligne ou un script Node.js pour générer le hash, puis :

```sql
-- Note: Le mot de passe doit être hashé avec bcrypt
-- Utilisez un outil en ligne ou un script pour générer le hash
INSERT INTO users (id, username, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin',
  '$2a$10$...', -- Remplacez par un hash bcrypt de votre mot de passe
  'admin',
  NOW(),
  NOW()
);
```

**Option 3 : Via l'interface web**

Une fois que vous avez créé un premier utilisateur admin, vous pouvez créer d'autres utilisateurs via l'interface web à `/admin/users`.

## Basculement entre les bases de données

Pour basculer entre les systèmes, modifiez simplement la variable d'environnement `DATABASE_TYPE` :

- `DATABASE_TYPE=sqlite` → Utilise SQLite (développement local)
- `DATABASE_TYPE=neon` → Utilise Neon (production - recommandé)
- `DATABASE_TYPE=supabase` → Utilise Supabase (production - legacy)

Si `DATABASE_TYPE` n'est pas défini :
- En développement (`NODE_ENV=development`) : SQLite par défaut
- En production (`NODE_ENV=production`) : Neon par défaut

## Structure de la table users

La table `users` contient les champs suivants :

- `id` : UUID (string)
- `username` : String unique
- `password` : Hash bcrypt du mot de passe
- `role` : 'admin' | 'manager'
- `businessId` : String optionnel
- `createdAt` : Timestamp ISO
- `updatedAt` : Timestamp ISO

