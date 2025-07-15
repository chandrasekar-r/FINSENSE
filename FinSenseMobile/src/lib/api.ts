import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Updated to use machine IP for iOS simulator
const API_BASE_URL = 'http://192.168.1.115:3000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased for OCR processing
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const authData = await AsyncStorage.getItem('auth-storage')
      if (authData) {
        const { state } = JSON.parse(authData)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      }
    } catch (error) {
      console.error('Failed to parse auth data:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        // Try to refresh the token
        const authData = await AsyncStorage.getItem('auth-storage')
        if (authData) {
          const { state } = JSON.parse(authData)
          if (state?.refreshToken) {
            // Make refresh request
            const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refresh_token: state.refreshToken
            })
            
            const newTokens = refreshResponse.data
            
            // Update the stored auth data
            const updatedAuthData = {
              ...JSON.parse(authData),
              state: {
                ...state,
                token: newTokens.access_token,
                refreshToken: newTokens.refresh_token
              }
            }
            await AsyncStorage.setItem('auth-storage', JSON.stringify(updatedAuthData))
            
            // TODO: Implement event system for token refresh notification
            // This would notify the auth store to sync tokens
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`
            
            // Retry the original request
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }
      
      // If refresh fails or no refresh token, handle auth expiration
      await AsyncStorage.removeItem('auth-storage')
      // TODO: Implement navigation to login screen
    }
    
    return Promise.reject(error)
  }
)

// API Types
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

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
}

export interface Transaction {
  id: string
  vendor_name: string
  amount: string | number
  tax_amount?: string | number
  currency: string
  transaction_date: string
  description: string
  transaction_type: 'income' | 'expense'
  user_id: string
  category_id: string
  category_name: string
  receipt_url?: string | null
  created_at: string
  updated_at: string
  receipt_details?: {
    items?: Array<{
      id: string
      name: string
      quantity: number
      price: number
      amount: number
    }>
    total_items?: number
    source?: string
    extractedText?: string
  }
}

export interface Category {
  id: string
  name: string
  description: string
  color: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  name: string
  amount: number
  spent: number
  category_id: string
  category_name: string
  start_date: string
  end_date: string
  status: 'active' | 'completed' | 'paused'
  created_at: string
  updated_at: string
}

// Auth API
export const authAPI = {
  login: (data: LoginRequest) => api.post<LoginResponse>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<{ user: User }>('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
}

// Transaction API
export const transactionAPI = {
  list: (params?: any) => api.get<Transaction[]>('/transactions', { params }),
  create: (data: any) => api.post<Transaction>('/transactions', data),
  update: (id: string, data: any) => api.put<Transaction>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
  uploadReceipt: (formData: FormData) => api.post('/transactions/upload-receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
}

// Category API
export const categoryAPI = {
  list: () => api.get<Category[]>('/categories'),
  create: (data: any) => api.post<Category>('/categories', data),
  update: (id: string, data: any) => api.put<Category>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
}

// Budget API
export const budgetAPI = {
  list: () => api.get<Budget[]>('/budgets'),
  create: (data: any) => api.post<Budget>('/budgets', data),
  update: (id: string, data: any) => api.put<Budget>(`/budgets/${id}`, data),
  delete: (id: string) => api.delete(`/budgets/${id}`),
}

// Receipt API
export const receiptAPI = {
  upload: (formData: FormData) => api.post('/receipts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  process: (receiptId: string) => api.post(`/receipts/${receiptId}/process`),
  status: (receiptId: string) => api.get(`/receipts/${receiptId}/status`),
}

// Chat API
export const chatAPI = {
  sendMessage: (message: string) => api.post('/chat/message', { message }),
  getHistory: () => api.get('/chat/history'),
  clearHistory: () => api.delete('/chat/history'),
}

export default api