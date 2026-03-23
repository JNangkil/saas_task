// Define UUID type for consistent usage
export type UUID = string;

// Language code type for user preferences
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'zh';

// Auth model representing the authentication session
export interface AuthModel {
  access_token: string;
  refresh_token?: string;
}

// Tenant model
export interface TenantModel {
  id: number;
  name: string;
  slug: string;
  role?: string;
}

// User model representing the user profile
export interface UserModel {
  id?: number;
  username?: string;
  password?: string; // Optional as we don't always retrieve passwords
  email: string;
  name?: string; // Backend returns 'name' instead of first_name/last_name
  first_name?: string;
  last_name?: string;
  fullname?: string; // May be stored directly in metadata
  email_verified?: boolean;
  occupation?: string;
  company_name?: string; // Using snake_case consistently
  phone?: string;
  roles?: number[]; // Array of role IDs
  pic?: string;
  language?: LanguageCode; // Maintain existing type
  is_admin?: boolean; // Added admin flag
  is_super_admin?: boolean; // Super admin flag
  current_tenant_id?: number; // Current active tenant ID
  tenant?: TenantModel; // Current tenant details
  tenants?: Record<string, number>; // All tenants user belongs to {name: id}
}
