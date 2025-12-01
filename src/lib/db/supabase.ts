import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { DatabaseAdapter, User, CreateUserInput, UpdateUserInput, PaginatedUsers } from './types';

export class SupabaseAdapter implements DatabaseAdapter {
  private supabase;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      throw new Error('Supabase URL and ANON KEY must be set in environment variables');
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error(`Invalid Supabase URL: "${url}". Must be a valid HTTP or HTTPS URL (e.g., https://your-project.supabase.co)`);
    }

    // Check if URL is not a placeholder
    if (url.includes('your_supabase_url') || url === 'your_supabase_url') {
      throw new Error('Supabase URL is not configured. Please set NEXT_PUBLIC_SUPABASE_URL to a valid Supabase project URL.');
    }

    try {
      this.supabase = createClient(url, key);
    } catch (error: any) {
      throw new Error(`Failed to create Supabase client: ${error.message}. Please check your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.`);
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role,
      businessId: data.businessId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role,
      businessId: data.businessId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const id = randomUUID();
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('users')
      .insert({
        id,
        username: input.username,
        password: hashedPassword,
        role: input.role,
        businessId: input.businessId || null,
        createdAt: now,
        updatedAt: now,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create user');
    }

    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role,
      businessId: data.businessId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (input.username !== undefined) {
      updates.username = input.username;
    }

    if (input.password !== undefined) {
      updates.password = await bcrypt.hash(input.password, 10);
    }

    if (input.role !== undefined) {
      updates.role = input.role;
    }

    if (input.businessId !== undefined) {
      updates.businessId = input.businessId || null;
    }

    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to update user');
    }

    return {
      id: data.id,
      username: data.username,
      password: data.password,
      role: data.role,
      businessId: data.businessId || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete user');
    }
  }

  async listUsers(): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to list users');
    }

    return (data || []).map(row => ({
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
    let query = this.supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('createdAt', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(error.message || 'Failed to list users');
    }

    return {
      data: (data || []).map(row => ({
        id: row.id,
        username: row.username,
        password: row.password,
        role: row.role,
        businessId: row.businessId || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  }
}

