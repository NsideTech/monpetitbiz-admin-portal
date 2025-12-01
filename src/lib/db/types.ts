export interface User {
  id: string;
  username: string;
  fullName?: string;
  password: string; // hashed
  role: 'admin' | 'owner' | 'seller' | 'manager';
  businessId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  username: string;
  fullName?: string;
  password: string; // plain text, will be hashed
  role: 'admin' | 'owner' | 'seller' | 'manager';
  businessId?: string;
}

export interface UpdateUserInput {
  username?: string;
  fullName?: string;
  password?: string; // plain text, will be hashed if provided
  role?: 'admin' | 'owner' | 'seller' | 'manager';
  businessId?: string;
}

export interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DatabaseAdapter {
  getUserByUsername(username: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
  updateUser(id: string, input: UpdateUserInput): Promise<User>;
  deleteUser(id: string): Promise<void>;
  listUsers(): Promise<User[]>;
  listUsersPaginated(page: number, limit: number, search?: string): Promise<PaginatedUsers>;
}

