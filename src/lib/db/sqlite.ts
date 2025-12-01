import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { randomUUID } from 'crypto';
import { DatabaseAdapter, User, CreateUserInput, UpdateUserInput, PaginatedUsers } from './types';

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), 'data', 'users.db');
    this.db = new Database(dbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        businessId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )
    `);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(username) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role as User['role'],
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role as User['role'],
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, password, role, businessId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.username,
      hashedPassword,
      input.role,
      input.businessId || null,
      now,
      now
    );

    const user = await this.getUserById(id);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const existing = await this.getUserById(id);
    if (!existing) throw new Error('User not found');

    const updates: string[] = [];
    const values: any[] = [];

    if (input.username !== undefined) {
      updates.push('username = ?');
      values.push(input.username);
    }

    if (input.password !== undefined) {
      const hashedPassword = await bcrypt.hash(input.password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (input.role !== undefined) {
      updates.push('role = ?');
      values.push(input.role);
    }

    if (input.businessId !== undefined) {
      updates.push('businessId = ?');
      values.push(input.businessId || null);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    const updated = await this.getUserById(id);
    if (!updated) throw new Error('Failed to update user');
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error('User not found');
    }
  }

  async listUsers(): Promise<User[]> {
    const stmt = this.db.prepare('SELECT * FROM users ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role as User['role'],
      businessId: row.businessId || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async listUsersPaginated(page: number, limit: number, search?: string): Promise<PaginatedUsers> {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const params: any[] = [];

    if (search) {
      query += ' WHERE username LIKE ?';
      countQuery += ' WHERE username LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const countStmt = this.db.prepare(countQuery);
    const countResult = countStmt.get(...params.slice(0, search ? 1 : 0)) as { total: number };
    const total = countResult.total;

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    const data = rows.map(row => ({
      id: row.id,
      username: row.username,
      password: row.password,
      role: row.role as User['role'],
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

