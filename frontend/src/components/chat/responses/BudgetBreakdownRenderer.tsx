import React from 'react'
import { useCurrency } from '../../../contexts/CurrencyContext'

interface BudgetItem {
  name: string
  category: string
  budget_amount: number
  spent: number
  remaining: number
  percentage_used: number
  status: string
}

interface BudgetBreakdownData {
  total_budgeted: number
  total_spent: number
  remaining_budget: number
  currency: string
  budgets: BudgetItem[]
}

interface BudgetBreakdownContent {
  message?: string
  data: BudgetBreakdownData
}

interface BudgetBreakdownRendererProps {
  content: BudgetBreakdownContent
}

export const BudgetBreakdownRenderer: React.FC<BudgetBreakdownRendererProps> = ({ content }) => {
  const { formatAmount } = useCurrency()
  const { message, data } = content
  const { total_budgeted, total_spent, remaining_budget, budgets } = data

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on track':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'over budget':
        return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      {/* Original message if provided */}
      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{message}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Budgeted</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {formatAmount(total_budgeted)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
          <div className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Total Spent</div>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            {formatAmount(total_spent)}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Remaining</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {formatAmount(remaining_budget)}
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-gray-900 dark:text-white">Overall Budget Progress</h4>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {Math.round((total_spent / total_budgeted) * 100)}% used
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getProgressColor((total_spent / total_budgeted) * 100)}`}
            style={{ width: `${Math.min((total_spent / total_budgeted) * 100, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Individual Budgets */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Budget Breakdown</h4>
        
        {budgets.map((budget, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h5 className="font-semibold text-gray-900 dark:text-white">{budget.name}</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">{budget.category}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(budget.status)}`}>
                {budget.status}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Budget</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {formatAmount(budget.budget_amount)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Spent</div>
                <div className="font-semibold text-orange-600 dark:text-orange-400">
                  {formatAmount(budget.spent)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
                <div className={`font-semibold ${budget.remaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatAmount(budget.remaining)}
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {budget.percentage_used}% used
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(budget.percentage_used)}`}
                  style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Quick Insights</h4>
        <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          {budgets.filter(b => b.percentage_used >= 80).map(budget => (
            <li key={budget.name} className="flex items-center">
              <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
              <span>
                {budget.name}: {budget.percentage_used}% of budget used
                {budget.percentage_used >= 100 && " (Over budget!)"}
              </span>
            </li>
          ))}
          {budgets.filter(b => b.percentage_used < 80).length === budgets.length && (
            <li>All budgets are on track! 🎉</li>
          )}
        </ul>
      </div>
    </div>
  )
}