import React, { useState, useMemo } from 'react'
import { useCurrency } from '../../../contexts/CurrencyContext'
import { CategoryPieChart } from '../../charts/CategoryPieChart'
import { SpendingTimelineChart } from '../../charts/SpendingTimelineChart'

interface Transaction {
  id: string
  vendor_name: string
  amount: number
  currency: string
  transaction_date: string
  description: string
  category_name: string
  category_id?: string
}

interface Analytics {
  total_amount: number
  transaction_count: number
  average_amount: number
  currencies: string[]
  category_breakdown: Array<{
    category: string
    amount: number
    count: number
    percentage: number
  }>
  daily_breakdown: Array<{
    date: string
    amount: number
    count: number
  }>
  date_range?: {
    start: string
    end: string
  }
}

interface TransactionData {
  transactions: Transaction[]
  analytics?: Analytics
  total?: number
  page?: number
  limit?: number
  total_pages?: number
}

interface TransactionListContent {
  message?: string
  data: TransactionData
}

interface TransactionListRendererProps {
  content: TransactionListContent
}

type SortField = 'date' | 'amount' | 'merchant' | 'category'
type SortDirection = 'asc' | 'desc'
type ViewMode = 'list' | 'chart' | 'both'

export const TransactionListRenderer: React.FC<TransactionListRendererProps> = ({ content }) => {
  const { formatAmount } = useCurrency()
  const { message, data } = content
  const { transactions } = data
  
  // State for filtering and sorting
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('both')
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set())

  // Process transactions for analysis
  const processedData = useMemo(() => {
    if (!transactions || transactions.length === 0) return null

    // Filter transactions
    let filteredTransactions = transactions.filter(tx => {
      const matchesCategory = categoryFilter === 'all' || tx.category_name === categoryFilter
      const matchesSearch = searchTerm === '' || 
        tx.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesCategory && matchesSearch
    })

    // Sort transactions
    filteredTransactions.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'date':
          comparison = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
          break
        case 'amount':
          comparison = a.amount - b.amount
          break
        case 'merchant':
          comparison = a.vendor_name.localeCompare(b.vendor_name)
          break
        case 'category':
          comparison = a.category_name.localeCompare(b.category_name)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    // Use backend analytics if available, otherwise calculate locally
    let categoryData: Array<{category: string, amount: number, count: number, percentage: number}>
    let timelineData: Array<{date: string, amount: number, count: number}>
    let totalAmount: number
    
    if (data.analytics && categoryFilter === 'all' && searchTerm === '') {
      // Use backend analytics for unfiltered data
      categoryData = data.analytics.category_breakdown
      timelineData = data.analytics.daily_breakdown
      totalAmount = data.analytics.total_amount
    } else {
      // Calculate locally for filtered data
      const categoryMap = new Map<string, { amount: number, count: number }>()
      totalAmount = 0

      filteredTransactions.forEach(tx => {
        const amount = tx.amount
        totalAmount += amount
        
        if (categoryMap.has(tx.category_name)) {
          const existing = categoryMap.get(tx.category_name)!
          categoryMap.set(tx.category_name, {
            amount: existing.amount + amount,
            count: existing.count + 1
          })
        } else {
          categoryMap.set(tx.category_name, { amount, count: 1 })
        }
      })

      categoryData = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: (data.amount / totalAmount) * 100
      })).sort((a, b) => b.amount - a.amount)

      // Calculate daily spending for timeline
      const dailyMap = new Map<string, { amount: number, count: number }>()
      filteredTransactions.forEach(tx => {
        const date = new Date(tx.transaction_date).toISOString().split('T')[0]
        if (dailyMap.has(date)) {
          const existing = dailyMap.get(date)!
          dailyMap.set(date, {
            amount: existing.amount + tx.amount,
            count: existing.count + 1
          })
        } else {
          dailyMap.set(date, { amount: tx.amount, count: 1 })
        }
      })

      timelineData = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    return {
      filteredTransactions,
      categoryData,
      timelineData,
      totalAmount,
      categories: Array.from(new Set(transactions.map(tx => tx.category_name))).sort()
    }
  }, [transactions, data.analytics, sortField, sortDirection, categoryFilter, searchTerm])

  if (!processedData) {
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{message}</p>
        )}
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-orange-800 dark:text-orange-200">No transactions found.</p>
        </div>
      </div>
    )
  }

  const { filteredTransactions, categoryData, timelineData, totalAmount, categories } = processedData

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleTransaction = (id: string) => {
    const newExpanded = new Set(expandedTransactions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedTransactions(newExpanded)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="space-y-6">
      {message && !message.includes('{') && message.length < 500 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{message}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatAmount(totalAmount)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {filteredTransactions.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatAmount(totalAmount / filteredTransactions.length)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Average</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {categoryData.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {(['list', 'chart', 'both'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Charts */}
      {(viewMode === 'chart' || viewMode === 'both') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm mr-2">📊</span>
              Spending by Category
            </h4>
            <CategoryPieChart data={categoryData} formatAmount={formatAmount} />
          </div>

          {/* Timeline Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm mr-2">📈</span>
              Spending Timeline
            </h4>
            <SpendingTimelineChart data={timelineData} formatAmount={formatAmount} type="bar" />
          </div>
        </div>
      )}

      {/* Transaction List */}
      {(viewMode === 'list' || viewMode === 'both') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Sort Controls */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap gap-2">
              {[
                { field: 'date' as SortField, label: 'Date' },
                { field: 'amount' as SortField, label: 'Amount' },
                { field: 'merchant' as SortField, label: 'Merchant' },
                { field: 'category' as SortField, label: 'Category' }
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    sortField === field
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {label} {getSortIcon(field)}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleTransaction(transaction.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {transaction.vendor_name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                          <span>{new Date(transaction.transaction_date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            {transaction.category_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatAmount(transaction.amount)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {expandedTransactions.has(transaction.id) ? '▼' : '▶'}
                    </span>
                  </div>
                </div>
                
                {/* Expanded Details */}
                {expandedTransactions.has(transaction.id) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Description:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Currency:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{transaction.currency}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
              <span>Showing {filteredTransactions.length} transactions</span>
              <span className="font-medium">Total: {formatAmount(totalAmount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}