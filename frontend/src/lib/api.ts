import axios from 'axios'

const API_BASE_URL = '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased for OCR processing
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth-storage')
    if (authData) {
      try {
        const { state } = JSON.parse(authData)
        if (state?.token) {
          config.headers.Authorization = `Bearer ${state.token}`
        }
      } catch (error) {
        console.error('Failed to parse auth data:', error)
      }
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
        const authData = localStorage.getItem('auth-storage')
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
            localStorage.setItem('auth-storage', JSON.stringify(updatedAuthData))
            
            // Notify auth store to sync tokens
            window.dispatchEvent(new CustomEvent('tokens-refreshed'))
            
            // Update the original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`
            
            // Retry the original request
            return api(originalRequest)
          }
        }
      } catch (refreshError) {
        console.log('Token refresh failed:', refreshError)
      }
      
      // If refresh fails or no refresh token, handle auth expiration
      localStorage.removeItem('auth-storage')
      window.dispatchEvent(new CustomEvent('auth-expired'))
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

export interface Transaction {
  id: string
  category_id: string
  amount: number
  description: string
  transaction_date: string
  vendor_name?: string
  merchant_name?: string // Legacy field for backwards compatibility
  transaction_type: 'income' | 'expense'
  category_name?: string
  category_color?: string
  category_icon?: string
  receipt_url?: string
  created_at: string
  updated_at: string
  receipt_id?: string
  receipt_details?: {
    extractedText?: string
    extracted_text?: string
    parsedData?: {
      merchantName?: string
      totalAmount?: number
      currency?: string
      date?: string
      category?: string
      items?: Array<{
        name: string
        amount: number
        quantity?: number
        category?: string
      }>
      confidence: number
    }
    parsed_data?: {
      merchantName?: string
      totalAmount?: number
      currency?: string
      date?: string
      category?: string
      items?: Array<{
        name: string
        amount: number
        quantity?: number
        category?: string
      }>
      confidence: number
    }
  }
}

export interface Category {
  id: string
  user_id: string
  name: string
  color: string
  icon: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  category_id: string
  name: string
  amount: number
  currency: string
  period_type: 'monthly' | 'weekly' | 'yearly'
  start_date: string
  end_date: string
  alert_threshold: number
  is_active: boolean
  category_name?: string
  category_color?: string
  category_icon?: string
  // Backend fields (snake_case)
  budget_amount?: string
  spent_amount?: string
  remaining_amount?: string
  percentage_used?: number
  days_remaining?: number
  alert_triggered?: boolean
  // Legacy frontend fields (camelCase) - for backwards compatibility
  budgetAmount?: number
  spentAmount?: number
  remainingAmount?: number
  percentageUsed?: number
  daysRemaining?: number
  alertTriggered?: boolean
  status?: 'on_track' | 'warning' | 'over_budget'
}

export interface ChatMessage {
  id: string
  user_message: string
  ai_response: string
  created_at: string
}

export interface ReceiptData {
  receiptId: string
  extractedText: string
  parsedData: {
    merchantName?: string
    totalAmount?: number
    currency?: string
    date?: string
    category?: string
    items?: Array<{
      name: string
      amount: number
      quantity?: number
      category?: string
    }>
    confidence: number
  }
  status: string
}

export interface ProcessingStatus {
  processing_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  progress_message: string
  extracted_data?: any
  file_name?: string
  file_size?: number
  created_at?: string
  updated_at?: string
}

export interface ActiveProcessingJob {
  processingId: string
  fileName: string
  fileSize: number
  uploadTime: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  progressMessage: string
}

// API Functions

// Auth
export const authAPI = {
  register: (data: {
    email: string
    password: string
    first_name: string
    last_name: string
    default_currency?: string
  }) => api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) => 
    api.post('/auth/login', data),
  
  refreshToken: (refreshToken: string) => 
    api.post('/auth/refresh', { refresh_token: refreshToken }),
  
  logout: () => api.post('/auth/logout'),
}

// Transactions
export const transactionAPI = {
  getTransactions: (params?: {
    page?: number
    limit?: number
    category?: string
    startDate?: string
    endDate?: string
    type?: string
  }) => {
    // Map frontend filter names to backend expected names
    const mappedParams: any = {}
    if (params) {
      if (params.page !== undefined) mappedParams.page = params.page
      if (params.limit !== undefined) mappedParams.limit = params.limit
      if (params.category && params.category.trim() !== '') mappedParams.category_id = params.category
      if (params.startDate && params.startDate.trim() !== '') mappedParams.start_date = params.startDate
      if (params.endDate && params.endDate.trim() !== '') mappedParams.end_date = params.endDate
      if (params.type && params.type.trim() !== '') mappedParams.transaction_type = params.type
    }
    return api.get('/transactions', { params: mappedParams })
  },
  
  createTransaction: (data: {
    category_id: string
    amount: number
    description: string
    transaction_date?: string
    vendor_name?: string
    merchant_name?: string
    transaction_type?: 'income' | 'expense'
    currency?: string
  }) => {
    // Ensure currency is provided, default to USD
    const transactionData = {
      ...data,
      currency: data.currency || 'USD',
      vendor_name: data.vendor_name || data.merchant_name,
      transaction_date: data.transaction_date ? new Date(data.transaction_date).toISOString() : new Date().toISOString()
    }
    return api.post('/transactions', transactionData)
  },
  
  getTransaction: (id: string) => api.get(`/transactions/${id}`),
  
  updateTransaction: (id: string, data: Partial<Transaction>) => 
    api.put(`/transactions/${id}`, data),
  
  deleteTransaction: (id: string) => api.delete(`/transactions/${id}`),

  uploadReceipt: (transactionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/upload/receipt/${transactionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  deleteReceipt: (transactionId: string) => 
    api.delete(`/upload/receipt/${transactionId}`),
  
  getSpendingSummary: (startDate?: string, endDate?: string) => {
    const params: any = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    return api.get('/transactions/summary/spending', { params })
  },
  
  getCategorySummary: (startDate?: string, endDate?: string) => {
    const params: any = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    return api.get('/transactions/summary/categories', { params })
  },
}

// Receipts
export const receiptAPI = {
  uploadReceipt: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/receipts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  
  getReceiptData: (id: string) => api.get(`/receipts/${id}`),
  
  confirmReceiptData: (id: string, confirmedData: any) => 
    api.put(`/receipts/${id}/confirm`, { confirmedData }),
  
  getProgress: (processingId: string) => api.get(`/receipts/${processingId}`),
  
  getActiveJobs: () => api.get('/receipts/active'),
}

// Chat
export const chatAPI = {
  sendMessage: (message: string) => 
    api.post('/chat/query', { message }),
  
  sendMessageStream: (message: string, onChunk: (chunk: string) => void, onComplete: (fullResponse: string) => void, onError: (error: string) => void, onStatus?: (status: string) => void): (() => void) => {
    const authData = localStorage.getItem('auth-storage')
    let token = ''
    
    if (authData) {
      try {
        const { state } = JSON.parse(authData)
        token = state?.token || ''
      } catch (error) {
        console.error('Failed to parse auth data:', error)
        onError('Authentication error')
        return () => {}
      }
    }

    let aborted = false

    // Use fetch with ReadableStream for SSE
    fetch(`${API_BASE_URL}/chat/query/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('No response body')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      function readStream(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done || aborted) {
            return
          }

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                
                switch (data.type) {
                  case 'connected':
                    // Connection established
                    break
                  case 'status':
                    if (onStatus) onStatus(data.message)
                    break
                  case 'structured':
                    // Handle structured response - convert to JSON string for compatibility
                    console.log('📊 Received structured response:', data.data)
                    const structuredResponse = JSON.stringify(data.data)
                    console.log('📊 Converted to JSON string:', structuredResponse.substring(0, 200) + '...')
                    onComplete(structuredResponse)
                    return
                  case 'chunk':
                    onChunk(data.content)
                    break
                  case 'complete':
                    onComplete(data.fullResponse)
                    return
                  case 'error':
                    onError(data.message)
                    return
                }
              } catch (error) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }

          return readStream()
        })
      }

      return readStream()
    })
    .catch(error => {
      if (!aborted) {
        console.error('Streaming request failed:', error)
        onError(error.message || 'Failed to send message')
      }
    })

    // Return cleanup function
    return () => {
      aborted = true
    }
  },
  
  getChatHistory: (params?: { page?: number; limit?: number }) => 
    api.get('/chat/history', { params }),
  
  clearChatHistory: () => api.delete('/chat/history'),
}

// Budgets
export const budgetAPI = {
  getBudgets: (includeStatus: boolean = true) => 
    api.get('/budgets', { params: { includeStatus } }),
  
  createBudget: (data: {
    category_id: string
    name: string
    amount: number
    currency: string
    period_type: 'monthly' | 'weekly' | 'yearly'
    start_date: string
    end_date?: string
    alert_threshold?: number
  }) => api.post('/budgets', data),
  
  getBudget: (id: string) => api.get(`/budgets/${id}`),
  
  updateBudget: (id: string, data: Partial<Budget>) => 
    api.put(`/budgets/${id}`, data),
  
  deleteBudget: (id: string) => api.delete(`/budgets/${id}`),
  
  getBudgetStatus: (id: string) => api.get(`/budgets/${id}/status`),
}

// Categories
export const categoryAPI = {
  getCategories: () => api.get('/categories'),
  
  createCategory: (data: {
    name: string
    color: string
    icon: string
  }) => api.post('/categories', data),
  
  updateCategory: (id: string, data: Partial<Category>) => 
    api.put(`/categories/${id}`, data),
  
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
}

// Users
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  
  updateProfile: (data: {
    first_name?: string
    last_name?: string
    default_currency?: string
  }) => api.put('/users/profile', data),
  
  deleteAccount: () => api.delete('/users/profile'),
  
  getSettings: () => api.get('/users/settings'),
  
  updateSettings: (data: any) => api.put('/users/settings', data),
}