import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI, User } from '../lib/api'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: RegisterData) => Promise<void>
  logout: () => Promise<void>
  initializeAuth: () => void
  refreshAuthToken: () => Promise<void>
  handleAuthExpired: () => void
  syncTokensFromStorage: () => void
}

interface RegisterData {
  email: string
  password: string
  first_name: string
  last_name: string
  default_currency?: string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authAPI.login({ email, password })
          const data = response.data  // FastAPI returns data directly
          
          set({
            user: data.user,
            token: data.access_token,  // Use access_token from FastAPI
            refreshToken: data.refresh_token,  // Use refresh_token from FastAPI
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Login failed'
          throw new Error(message)
        }
      },

      register: async (userData: RegisterData) => {
        set({ isLoading: true })
        try {
          const response = await authAPI.register(userData)
          const data = response.data  // FastAPI returns data directly
          
          set({
            user: data,  // Register returns UserResponse directly
            token: null,  // Register doesn't include tokens yet
            refreshToken: null,
            isAuthenticated: false,  // User needs to login after registration
            isLoading: false,
          })
        } catch (error: any) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Registration failed'
          throw new Error(message)
        }
      },

      logout: async () => {
        try {
          await authAPI.logout()
        } catch (error) {
          console.error('Logout error:', error)
        } finally {
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isInitialized: false,
          })
          localStorage.removeItem('auth-storage')
        }
      },

      refreshAuthToken: async () => {
        const { refreshToken } = get()
        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await authAPI.refreshToken(refreshToken)
          const data = response.data  // FastAPI returns data directly
          
          set({
            token: data.access_token,  // Use access_token from FastAPI
            refreshToken: data.refresh_token,  // Use refresh_token from FastAPI
          })
        } catch (error) {
          // If refresh fails, logout user
          get().logout()
          throw error
        }
      },

      initializeAuth: () => {
        const { token, refreshToken } = get()
        if (token && refreshToken) {
          set({ isAuthenticated: true, isInitialized: true })
        } else {
          set({ isInitialized: true })
        }
      },

      handleAuthExpired: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitialized: false,
        })
        localStorage.removeItem('auth-storage')
      },

      syncTokensFromStorage: () => {
        const authData = localStorage.getItem('auth-storage')
        if (authData) {
          try {
            const { state } = JSON.parse(authData)
            if (state?.token && state?.refreshToken) {
              set({
                token: state.token,
                refreshToken: state.refreshToken,
                isAuthenticated: true
              })
            }
          } catch (error) {
            console.error('Failed to sync tokens from storage:', error)
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export const useUserCurrency = () => {
  const user = useAuthStore((state) => state.user)
  return user?.default_currency || 'USD'
}