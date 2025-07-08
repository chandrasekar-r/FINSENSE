import React, { useState, useEffect } from 'react'
import { budgetAPI, categoryAPI } from '../lib/api'
import { format } from 'date-fns'
import { formatCurrency } from '../lib/utils'
import { useUserCurrency } from '../stores/authStore'
import type { Budget, Category } from '../lib/api'

interface BudgetFormData {
  category_id: string;
  name: string;
  amount: string;
  period_type: 'monthly' | 'weekly' | 'yearly';
  start_date: string;
  end_date: string;
}

export const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Debug budgets state changes
  useEffect(() => {
    console.log('🔍 [BudgetsPage] Budgets state changed:', budgets)
    console.log('🔍 [BudgetsPage] Budgets state length:', budgets.length)
  }, [budgets])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [budgetToDelete, setBudgetToDelete] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [newBudget, setNewBudget] = useState<BudgetFormData>({
    category_id: '',
    name: '',
    amount: '',
    period_type: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  })
  const userCurrency = useUserCurrency()

  useEffect(() => {
    fetchBudgets()
    fetchCategories()
  }, [])

  const fetchBudgets = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await budgetAPI.getBudgets(true)
      console.log('🔍 [BudgetsPage] Fetched budgets response:', response.data)
      console.log('🔍 [BudgetsPage] Budget data:', response.data.data)
      console.log('🔍 [BudgetsPage] Budget array length:', (response.data.data || []).length)
      setBudgets(response.data.data || [])
    } catch (error: any) {
      console.error('❌ [BudgetsPage] Failed to fetch budgets:', error)
      setError(error.response?.data?.message || 'Failed to fetch budgets')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getCategories()
      console.log('🔍 [BudgetsPage] Fetched categories:', response.data.data)
      setCategories(response.data.data || [])
    } catch (error: any) {
      console.error('❌ [BudgetsPage] Failed to fetch categories:', error)
      setError(error.response?.data?.message || 'Failed to fetch categories')
    }
  }

  const handleDeleteBudget = (id: string) => {
    setBudgetToDelete(id)
    setShowDeleteModal(true)
  }

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return

    try {
      await budgetAPI.deleteBudget(budgetToDelete)
      setBudgets((prev: Budget[]) => prev.filter((b: Budget) => b.id !== budgetToDelete))
      setShowDeleteModal(false)
      setBudgetToDelete(null)
      setError(null)
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete budget')
    }
  }

  const cancelDelete = () => {
    setShowDeleteModal(false)
    setBudgetToDelete(null)
  }

  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newBudget.category_id || !newBudget.name || !newBudget.amount) {
      setError('Please fill in all required fields')
      return
    }

    // Validate that category_id is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(newBudget.category_id)) {
      console.error('❌ [BudgetsPage] Invalid category_id format:', newBudget.category_id)
      setError('Please select a valid category')
      return
    }

    try {
      const budgetData = {
        category_id: newBudget.category_id,
        name: newBudget.name,
        amount: parseFloat(newBudget.amount),
        currency: userCurrency,
        period_type: newBudget.period_type,
        start_date: newBudget.start_date,
        end_date: newBudget.end_date || undefined
      }

      console.log('🔍 [BudgetsPage] Creating budget with data:', budgetData)
      console.log('🔍 [BudgetsPage] Categories available:', categories)
      console.log('🔍 [BudgetsPage] Selected category_id:', newBudget.category_id)

      await budgetAPI.createBudget(budgetData)
      
      // Reset form and close modal
      setNewBudget({
        category_id: '',
        name: '',
        amount: '',
        period_type: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      })
      setShowAddModal(false)
      setError(null)
      
      // Refresh budgets
      fetchBudgets()
    } catch (error: any) {
      console.error('❌ [BudgetsPage] Budget creation failed:', error)
      console.error('❌ [BudgetsPage] Error response:', error.response?.data)
      setError(error.response?.data?.message || 'Failed to create budget')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'bg-green-100 text-green-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      case 'over_budget':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'on_track':
        return 'On Track'
      case 'warning':
        return 'Warning'
      case 'over_budget':
        return 'Over Budget'
      default:
        return 'Unknown'
    }
  }

  const getProgressWidth = (percentageUsed: number) => {
    return Math.min(Math.max(percentageUsed, 0), 100)
  }

  const getProgressColor = (percentageUsed: number) => {
    if (percentageUsed >= 100) return 'bg-red-500'
    if (percentageUsed >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your spending against your budgets</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        >
          Add Budget
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading budgets...</p>
        </div>
      ) : (console.log('🔍 [BudgetsPage] Rendering budgets, length:', budgets.length), budgets.length === 0) ? (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No budgets yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first budget to start tracking your spending</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            Create Budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <div key={budget.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{budget.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{budget.period_type}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(budget.status || 'unknown')}`}>
                    {getStatusText(budget.status || 'unknown')}
                  </span>
                  <button
                    onClick={() => handleDeleteBudget(budget.id)}
                    className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round(budget.percentageUsed || 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(budget.percentageUsed || 0)}`}
                    style={{ width: `${getProgressWidth(budget.percentageUsed || 0)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Budget:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(budget.budgetAmount || budget.amount, userCurrency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Spent:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(budget.spentAmount || 0, userCurrency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remaining:</span>
                  <span className={`text-sm font-medium ${
                    (budget.remainingAmount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatCurrency(budget.remainingAmount || 0, userCurrency)}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                  <span>Period:</span>
                  <span>
                    {format(new Date(budget.start_date), 'MMM dd')} - {format(new Date(budget.end_date), 'MMM dd')}
                  </span>
                </div>
                {budget.daysRemaining !== undefined && (
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                    <span>Days remaining:</span>
                    <span>{budget.daysRemaining}</span>
                  </div>
                )}
              </div>

              {budget.category_name && (
                <div className="mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                    {budget.category_name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Budget</h3>
              
              <form onSubmit={handleCreateBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Budget Name *
                  </label>
                  <input
                    type="text"
                    value={newBudget.name}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Monthly Groceries"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={newBudget.category_id}
                    onChange={(e) => {
                      console.log('🔍 [BudgetsPage] Category selected:', e.target.value)
                      const selectedCategory = categories.find(c => c.id === e.target.value)
                      console.log('🔍 [BudgetsPage] Selected category object:', selectedCategory)
                      setNewBudget(prev => ({ ...prev, category_id: e.target.value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => {
                      console.log('🔍 [BudgetsPage] Rendering category option:', category)
                      return (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Budget Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Period Type
                  </label>
                  <select
                    value={newBudget.period_type}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, period_type: e.target.value as 'monthly' | 'weekly' | 'yearly' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newBudget.start_date}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newBudget.end_date}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                  >
                    Create Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.148 0 2.062-.929 2.062-2.077v-8.846C21 6.929 20.085 6 18.938 6H5.062C3.915 6 3 6.929 3 8.077v8.846C3 18.071 3.915 19 5.062 19z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">Delete Budget</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this budget? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteBudget}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
