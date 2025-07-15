import React from 'react'
import { useCurrency } from '../../../contexts/CurrencyContext'

interface SpendingAnalysisData {
  total_spent?: number
  category_breakdown?: Array<{
    category: string
    amount: number
    percentage: number
  }> | Array<{
    category_name: string
    total_amount: number
    percentage: number
  }>
  period: string
  currency?: string
  insights?: string[]
  summary?: {
    total_expenses: number
  }
  total?: number
}

interface SpendingAnalysisContent {
  message?: string
  data: SpendingAnalysisData
}

interface SpendingAnalysisRendererProps {
  content: SpendingAnalysisContent
}

export const SpendingAnalysisRenderer: React.FC<SpendingAnalysisRendererProps> = ({ content }) => {
  const { formatAmount } = useCurrency()
  const { message, data } = content
  
  // Handle different data structures safely
  const total_spent = data.total_spent || data.total || data.summary?.total_expenses || 0
  const period = data.period || 'period'
  const insights = data.insights || []
  
  // Normalize category breakdown structure
  const category_breakdown = Array.isArray(data.category_breakdown) 
    ? data.category_breakdown.map(item => {
        // Handle both possible structures
        if ('category_name' in item) {
          return {
            category: item.category_name,
            amount: item.total_amount,
            percentage: item.percentage
          }
        }
        return {
          category: item.category,
          amount: item.amount,
          percentage: item.percentage
        }
      })
    : []

  const getCategoryColor = (category: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500',
    ]
    let hash = 0
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="space-y-6">
      {/* Original message if provided */}
      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{message}</p>
        </div>
      )}

      {category_breakdown.length > 0 ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Spent</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatAmount(total_spent)}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">{period}</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Categories</div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {category_breakdown.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Spending categories</div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Spending by Category</h4>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {category_breakdown.map((category, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${getCategoryColor(category.category)}`}></div>
                      <span className="font-medium text-gray-900 dark:text-white">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatAmount(category.amount)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {category.percentage?.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getCategoryColor(category.category)}`}
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          {insights && insights.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Insights</h4>
              <ul className="space-y-1">
                {insights.map((insight, index) => (
                  <li key={index} className="text-sm text-amber-800 dark:text-amber-200 flex items-start">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Top Categories */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {category_breakdown.slice(0, 3).map((category, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-2">
                  <div className={`w-2 h-2 rounded-full mr-2 ${getCategoryColor(category.category)}`}></div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {category.category}
                  </span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAmount(category.amount)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {category.percentage?.toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No spending data available for analysis.
        </div>
      )}
    </div>
  )
}