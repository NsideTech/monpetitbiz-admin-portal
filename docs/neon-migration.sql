-- Migration SQL pour créer la table users dans Neon
-- Exécutez ce script dans l'éditeur SQL de votre projet Neon

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

