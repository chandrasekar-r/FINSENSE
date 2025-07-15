import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { transactionAPI, Transaction } from '../lib/api'

export interface TransactionFilters {
  search?: string
  type?: 'income' | 'expense' | 'all'
  categoryId?: string
  startDate?: string
  endDate?: string
  sortBy?: 'date' | 'amount' | 'vendor'
  sortOrder?: 'asc' | 'desc'
}

export interface TransactionFormData {
  vendor_name: string
  amount: string
  tax_amount?: string
  description: string
  transaction_type: 'income' | 'expense'
  category_id: string
  transaction_date: string
  receipt_url?: string
}

interface TransactionState {
  transactions: Transaction[]
  currentTransaction: Transaction | null
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  filters: TransactionFilters
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  
  // Actions
  fetchTransactions: (refresh?: boolean) => Promise<void>
  loadMoreTransactions: () => Promise<void>
  refreshTransactions: () => Promise<void>
  createTransaction: (data: TransactionFormData) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<TransactionFormData>) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  getTransaction: (id: string) => Promise<Transaction | null>
  setCurrentTransaction: (transaction: Transaction | null) => void
  updateFilters: (filters: Partial<TransactionFilters>) => void
  clearFilters: () => void
  exportTransactions: (format: 'csv' | 'json') => Promise<string>
  clearError: () => void
}

const initialFilters: TransactionFilters = {
  search: '',
  type: 'all',
  sortBy: 'date',
  sortOrder: 'desc'
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],
      currentTransaction: null,
      isLoading: false,
      isRefreshing: false,
      error: null,
      filters: initialFilters,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true
      },

      fetchTransactions: async (refresh = false) => {
        const state = get()
        if (state.isLoading && !refresh) return
        
        set({ 
          isLoading: true, 
          error: null,
          isRefreshing: refresh
        })
        
        try {
          const { filters, pagination } = get()
          const params = {
            page: refresh ? 1 : pagination.page,
            limit: pagination.limit,
            search: filters.search,
            type: filters.type === 'all' ? undefined : filters.type,
            category_id: filters.categoryId,
            start_date: filters.startDate,
            end_date: filters.endDate,
            sort_by: filters.sortBy,
            sort_order: filters.sortOrder
          }
          
          const response = await transactionAPI.list(params)
          const newTransactions = response.data || []
          
          set(state => ({
            transactions: refresh || pagination.page === 1 
              ? newTransactions 
              : [...state.transactions, ...newTransactions],
            pagination: {
              ...state.pagination,
              page: refresh ? 1 : pagination.page,
              total: response.headers?.['x-total-count'] ? 
                parseInt(response.headers['x-total-count']) : 
                newTransactions.length,
              hasMore: newTransactions.length === pagination.limit
            },
            isLoading: false,
            isRefreshing: false
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to fetch transactions'
          set({ 
            error: message,
            isLoading: false,
            isRefreshing: false
          })
          throw new Error(message)
        }
      },

      loadMoreTransactions: async () => {
        const { pagination, isLoading } = get()
        if (isLoading || !pagination.hasMore) return
        
        set(state => ({
          pagination: { ...state.pagination, page: state.pagination.page + 1 }
        }))
        
        await get().fetchTransactions(false)
      },

      refreshTransactions: async () => {
        await get().fetchTransactions(true)
      },

      createTransaction: async (data: TransactionFormData) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await transactionAPI.create(data)
          const newTransaction = response.data
          
          set(state => ({
            transactions: [newTransaction, ...state.transactions],
            pagination: {
              ...state.pagination,
              total: state.pagination.total + 1
            },
            isLoading: false
          }))
          
          return newTransaction
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to create transaction'
          set({ error: message, isLoading: false })
          throw new Error(message)
        }
      },

      updateTransaction: async (id: string, data: Partial<TransactionFormData>) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await transactionAPI.update(id, data)
          const updatedTransaction = response.data
          
          set(state => ({
            transactions: state.transactions.map(transaction =>
              transaction.id === id ? updatedTransaction : transaction
            ),
            currentTransaction: state.currentTransaction?.id === id 
              ? updatedTransaction 
              : state.currentTransaction,
            isLoading: false
          }))
          
          return updatedTransaction
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to update transaction'
          set({ error: message, isLoading: false })
          throw new Error(message)
        }
      },

      deleteTransaction: async (id: string) => {
        set({ isLoading: true, error: null })
        
        try {
          await transactionAPI.delete(id)
          
          set(state => ({
            transactions: state.transactions.filter(transaction => transaction.id !== id),
            currentTransaction: state.currentTransaction?.id === id 
              ? null 
              : state.currentTransaction,
            pagination: {
              ...state.pagination,
              total: Math.max(0, state.pagination.total - 1)
            },
            isLoading: false
          }))
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to delete transaction'
          set({ error: message, isLoading: false })
          throw new Error(message)
        }
      },

      getTransaction: async (id: string) => {
        const { transactions } = get()
        
        // First check if it's already in the store
        const existing = transactions.find(t => t.id === id)
        if (existing) {
          set({ currentTransaction: existing })
          return existing
        }
        
        // If not found, fetch from API
        set({ isLoading: true, error: null })
        
        try {
          const response = await transactionAPI.list({ id })
          const transaction = response.data?.[0] || null
          
          set({ 
            currentTransaction: transaction,
            isLoading: false
          })
          
          return transaction
        } catch (error: any) {
          const message = error.response?.data?.message || 'Failed to fetch transaction'
          set({ error: message, isLoading: false })
          throw new Error(message)
        }
      },

      setCurrentTransaction: (transaction: Transaction | null) => {
        set({ currentTransaction: transaction })
      },

      updateFilters: (newFilters: Partial<TransactionFilters>) => {
        set(state => ({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, page: 1 }
        }))
        
        // Auto-fetch when filters change
        get().fetchTransactions(true)
      },

      clearFilters: () => {
        set({ 
          filters: initialFilters,
          pagination: { ...get().pagination, page: 1 }
        })
        
        get().fetchTransactions(true)
      },

      exportTransactions: async (format: 'csv' | 'json') => {
        const { transactions, filters } = get()
        
        try {
          // For now, export current loaded transactions
          // In a real app, you might want to fetch all transactions
          const dataToExport = transactions.map(t => ({
            id: t.id,
            vendor_name: t.vendor_name,
            amount: t.amount,
            tax_amount: t.tax_amount,
            currency: t.currency,
            transaction_date: t.transaction_date,
            description: t.description,
            transaction_type: t.transaction_type,
            category_name: t.category_name,
            created_at: t.created_at
          }))
          
          if (format === 'csv') {
            const headers = Object.keys(dataToExport[0] || {})
            const csvContent = [
              headers.join(','),
              ...dataToExport.map(row => 
                headers.map(header => 
                  JSON.stringify(row[header as keyof typeof row] || '')
                ).join(',')
              )
            ].join('\n')
            
            return csvContent
          } else {
            return JSON.stringify(dataToExport, null, 2)
          }
        } catch (error: any) {
          const message = 'Failed to export transactions'
          set({ error: message })
          throw new Error(message)
        }
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'transaction-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist transactions and filters, not loading states
        transactions: state.transactions.slice(0, 50), // Limit cached transactions
        filters: state.filters,
      }),
    }
  )
)

// Helper hooks
export const useTransactionById = (id: string) => {
  const transactions = useTransactionStore(state => state.transactions)
  return transactions.find(t => t.id === id)
}

export const useTransactionStats = () => {
  const transactions = useTransactionStore(state => state.transactions)
  
  const stats = transactions.reduce((acc, transaction) => {
    const amount = typeof transaction.amount === 'string' 
      ? parseFloat(transaction.amount) 
      : transaction.amount
    
    if (transaction.transaction_type === 'income') {
      acc.totalIncome += amount
      acc.incomeCount += 1
    } else {
      acc.totalExpenses += amount
      acc.expenseCount += 1
    }
    
    return acc
  }, {
    totalIncome: 0,
    totalExpenses: 0,
    incomeCount: 0,
    expenseCount: 0
  })
  
  return {
    ...stats,
    netAmount: stats.totalIncome - stats.totalExpenses,
    totalCount: stats.incomeCount + stats.expenseCount
  }
}