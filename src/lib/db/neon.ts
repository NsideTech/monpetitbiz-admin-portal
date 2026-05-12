import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DatabaseAdapter, User, CreateUserInput, UpdateUserInput, PaginatedUsers } from './types';

export class NeonAdapter implements DatabaseAdapter {
  private sql: ReturnType<typeof neon>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL must be set in environment variables for Neon database');
    }

    // Validate connection string format
    if (!connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
      throw new Error(`Invalid DATABASE_URL: "${connectionString}". Must be a valid PostgreSQL connection string (e.g., postgres://user:password@host/database)`);
    }

    try {
      this.sql = neon(connectionString);
    } catch (error: any) {
      throw new Error(`Failed to create Neon client: ${error.message}. Please check your DATABASE_URL.`);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const rows = (await this.sql`
      SELECT * FROM users WHERE username = ${username}
    `) as any[];

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const rows = (await this.sql`
      SELECT * FROM users WHERE id = ${id}
    `) as any[];

    if (!rows || rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const now = new Date().toISOString();

    const rows = (await this.sql`
      INSERT INTO users (id, username, password, role, "businessId", "createdAt", "updatedAt")
      VALUES (${id}, ${input.username}, ${hashedPassword}, ${input.role}, ${input.businessId || null}, ${now}, ${now})
      RETURNING *
    `) as any[];

    if (!rows || rows.length === 0) {
      throw new Error('Failed to create user');
    }

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    // Get existing user first
    const existing = await this.getUserById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    // Prepare update values
    const username = input.username !== undefined ? input.username : existing.username;
    const password = input.password !== undefined 
      ? await bcrypt.hash(input.password, 10) 
      : existing.password;
    const role = input.role !== undefined ? input.role : existing.role;
    const businessId = input.businessId !== undefined ? input.businessId : existing.businessId;
    const updatedAt = new Date().toISOString();

    const rows = (await this.sql`
      UPDATE users 
      SET "username" = ${username},
          "password" = ${password},
          "role" = ${role},
          "businessId" = ${businessId || null},
          "updatedAt" = ${updatedAt}
      WHERE id = ${id}
      RETURNING *
    `) as any[];

    if (!rows || rows.length === 0) {
      throw new Error('Failed to update user');
    }

    const row = rows[0];
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async deleteUser(id: string): Promise<void> {
    const rows = (await this.sql`
      DELETE FROM users WHERE id = ${id} RETURNING id
    `) as any[];

    if (!rows || rows.length === 0) {
      throw new Error('User not found');
    }
  }

  async listUsers(): Promise<User[]> {
    const rows = (await this.sql`
      SELECT * FROM users ORDER BY "createdAt" DESC
    `) as any[];

    return rows.map((row: any) => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async listUsersPaginated(page: number, limit: number, search?: string): Promise<PaginatedUsers> {
    const offset = (page - 1) * limit;

    let countRows: any[];
    let dataRows: any[];

    if (search) {
      const searchPattern = `%${search}%`;
      countRows = (await this.sql`
        SELECT COUNT(*) as total FROM users WHERE username ILIKE ${searchPattern}
      `) as any[];
      
      dataRows = (await this.sql`
        SELECT * FROM users 
        WHERE username ILIKE ${searchPattern}
        ORDER BY "createdAt" DESC 
        LIMIT ${limit} OFFSET ${offset}
      `) as any[];
    } else {
      countRows = (await this.sql`
        SELECT COUNT(*) as total FROM users
      `) as any[];
      
      dataRows = (await this.sql`
        SELECT * FROM users 
        ORDER BY "createdAt" DESC 
        LIMIT ${limit} OFFSET ${offset}
      `) as any[];
    }

    const total = parseInt(countRows[0]?.total || '0', 10);
    const data = dataRows.map((row: any) => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role,
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

