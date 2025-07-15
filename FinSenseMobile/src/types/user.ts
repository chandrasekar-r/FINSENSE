export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  default_currency: string
  created_at: string
  is_active: boolean
  email_verified: boolean
}

export interface UserSettings {
  id: string
  user_id: string
  default_currency: string
  date_format: string
  timezone: string
  notification_preferences: {
    email: boolean
    push: boolean
    budget_alerts: boolean
    weekly_summary: boolean
  }
  created_at: string
  updated_at: string
}