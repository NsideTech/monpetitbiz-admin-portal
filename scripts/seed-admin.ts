/**
 * Script pour créer un utilisateur admin initial
 * 
 * Usage:
 *   npm run seed:admin <username> <password>
 * 
 * Exemple:
 *   npm run seed:admin admin monmotdepasse123
 * 
 * Note: Assurez-vous que DATABASE_TYPE est configuré dans votre fichier .env
 *       (sqlite pour le développement local, supabase pour la production)
 */

import { getDatabase } from '../src/lib/db';

async function seedAdmin() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <username> <password>');
    process.exit(1);
  }

  const [username, password] = args;

  try {
    const db = getDatabase();
    
    // Vérifier si l'utilisateur existe déjà
    const existing = await db.getUserByUsername(username);
    if (existing) {
      console.error(`L'utilisateur "${username}" existe déjà.`);
      process.exit(1);
    }

    // Créer l'utilisateur admin
    const user = await db.createUser({
      username,
      password,
      role: 'admin',
    });

    console.log(`✅ Utilisateur admin créé avec succès:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur admin:', error.message);
    process.exit(1);
  }
}

seedAdmin();

