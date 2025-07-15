import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { userAPI } from '../lib/api'
import { useAuthStore } from '../stores/authStore'

interface CurrencyContextType {
  currency: string
  currencySymbol: string
  setCurrency: (currency: string) => void
  formatAmount: (amount: number | string | undefined | null) => string
  isLoading: boolean
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$'
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

interface CurrencyProviderProps {
  children: ReactNode
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isInitialized } = useAuthStore()
  const [currency, setCurrencyState] = useState<string>('USD')
  const [isLoading, setIsLoading] = useState(true)
  const [hasInitialized, setHasInitialized] = useState(false)

  // Initialize currency from user data or fetch from API
  useEffect(() => {
    const initializeCurrency = async () => {
      try {
        // First try to get currency from auth store
        if (user?.default_currency) {
          setCurrencyState(user.default_currency)
          setIsLoading(false)
          return
        }

        // If user is authenticated but no currency in store, fetch from API
        if (isAuthenticated) {
          const response = await userAPI.getProfile()
          const userProfile = response.data.data
          if (userProfile?.default_currency) {
            setCurrencyState(userProfile.default_currency)
          }
        }
      } catch (error) {
        console.warn('Failed to fetch user currency, using default USD')
      } finally {
        setIsLoading(false)
        setHasInitialized(true)
      }
    }

    // Only initialize once auth store is ready
    if (isInitialized && !hasInitialized) {
      initializeCurrency()
    }
  }, [user, isAuthenticated, isInitialized, hasInitialized])

  const setCurrency = async (newCurrency: string) => {
    try {
      // Update locally first for immediate UI response
      setCurrencyState(newCurrency)
      
      // Update in backend
      await userAPI.updateProfile({ default_currency: newCurrency })
      
      // Update auth store user data to keep it in sync
      const { user } = useAuthStore.getState()
      if (user) {
        useAuthStore.setState({
          user: { ...user, default_currency: newCurrency }
        })
      }
    } catch (error) {
      console.error('Failed to update currency:', error)
      // Revert on error
      setCurrencyState(currency)
      throw error
    }
  }

  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency

  const formatAmount = (amount: number | string | undefined | null): string => {
    // Convert to number and handle edge cases
    const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount || 0))
    
    // Handle NaN or invalid numbers
    if (isNaN(numAmount)) {
      return `${currencySymbol}0.00`
    }
    
    return `${currencySymbol}${numAmount.toFixed(2)}`
  }

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencySymbol,
        setCurrency,
        formatAmount,
        isLoading
      }}
    >
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}