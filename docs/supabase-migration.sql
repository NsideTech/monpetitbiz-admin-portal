-- Migration SQL pour créer la table users dans Supabase
-- Exécutez ce script dans l'éditeur SQL de votre projet Supabase

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager')),
  "businessId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Créer un index sur username pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Créer un index sur businessId pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_users_businessId ON users("businessId");

-- Fonction pour mettre à jour automatiquement updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updatedAt automatiquement
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Activer Row Level Security (RLS) pour la sécurité
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Politique RLS : Les utilisateurs peuvent lire leurs propres données
-- Note: Cette politique peut être ajustée selon vos besoins de sécurité
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  USING (auth.uid()::text = id::text);

-- Politique RLS : Seuls les admins peuvent créer, modifier et supprimer
-- Note: Vous devrez peut-être ajuster cette politique selon votre système d'authentification
-- Pour l'instant, nous désactivons RLS pour permettre l'utilisation via l'API Next.js
-- Vous pouvez activer RLS plus tard une fois que vous aurez configuré l'authentification Supabase

-- Pour désactiver RLS temporairement (pour l'utilisation via l'API Next.js) :
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Ou créer une politique plus permissive pour l'API :
-- CREATE POLICY "Allow all operations for service role"
--   ON users
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

