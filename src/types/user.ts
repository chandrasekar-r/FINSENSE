export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  default_currency: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  email_verified: boolean;
}

export interface UserSettings {
  id: string;
  user_id: string;
  default_currency: string;
  date_format: string;
  timezone: string;
  notification_preferences: {
    email: boolean;
    push: boolean;
    budget_alerts: boolean;
    weekly_summary: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  default_currency?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateUserRequest {
  first_name?: string;
  last_name?: string;
  default_currency?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  default_currency: string;
  created_at: Date;
  is_active: boolean;
  email_verified: boolean;
}