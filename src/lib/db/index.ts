import { DatabaseAdapter } from './types';
import { SQLiteAdapter } from './sqlite';
import { SupabaseAdapter } from './supabase';

let dbAdapter: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (dbAdapter) {
    return dbAdapter;
  }

  const dbType = process.env.DATABASE_TYPE || 
    (process.env.NODE_ENV === 'production' ? 'supabase' : 'sqlite');

  if (dbType === 'supabase') {
    try {
      dbAdapter = new SupabaseAdapter();
    } catch (error: any) {
      console.error('Failed to initialize Supabase adapter:', error.message);
      throw new Error(
        `Cannot use Supabase database: ${error.message}\n` +
        `Please either:\n` +
        `1. Set DATABASE_TYPE=sqlite to use SQLite (for local development), or\n` +
        `2. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY with valid values`
      );
    }
  } else {
    dbAdapter = new SQLiteAdapter();
  }

  return dbAdapter;
}

export * from './types';

