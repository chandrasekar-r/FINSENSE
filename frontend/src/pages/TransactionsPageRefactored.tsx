import React, { useState, useEffect } from 'react'
import { transactionAPI, Transaction } from '../lib/api'
import { format } from 'date-fns'
import { useCurrency } from '../contexts/CurrencyContext'
import { useCategoryStore } from '../stores/categoryStore'
import { Modal } from '../components/ui/Modal'
import { FormField } from '../components/ui/FormField'
import { Table } from '../components/ui/Table'
import { Pagination } from '../components/ui/Pagination'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ReceiptUpload } from '../components/receipts/ReceiptUpload'
import { FileText } from 'lucide-react'

interface TransactionFormData {
  category_id: string
  amount: string
  description: string
  transaction_date: string
  vendor_name: string
  transaction_type: 'income' | 'expense'
}

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    startDate: '',
    endDate: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [transactionForm, setTransactionForm] = useState<TransactionFormData>({
    category_id: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    transaction_type: 'expense'
  })
  const { formatAmount } = useCurrency()
  const { categories, fetchCategories } = useCategoryStore()
  const [transactionDetails, setTransactionDetails] = useState<any>(null)

  useEffect(() => {
    fetchTransactions()
    if (categories.length === 0) {
      fetchCategories()
    }
  }, [filters, currentPage])

  const fetchTransactions = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await transactionAPI.getTransactions({
        page: currentPage,
        limit: 10,
        ...filters
      })
      
      const apiData = response.data.data
      const transactions = apiData.transactions || []
      const total = apiData.total || 0
      
      setTransactions(transactions)
      setTotalCount(total)
      setTotalPages(apiData.total_pages || Math.ceil(total / 10))
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to fetch transactions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transactionForm.category_id || !transactionForm.amount || !transactionForm.description) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const transactionData = {
        category_id: transactionForm.category_id,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description,
        transaction_date: transactionForm.transaction_date + 'T12:00:00.000Z',
        vendor_name: transactionForm.vendor_name || '',
        transaction_type: transactionForm.transaction_type,
        currency: 'EUR'
      }

      await transactionAPI.createTransaction(transactionData)
      
      resetForm()
      setShowAddModal(false)
      fetchTransactions()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to create transaction')
    }
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedTransaction || !transactionForm.category_id || !transactionForm.amount || !transactionForm.description) {
      setError('Please fill in all required fields')
      return
    }

    try {
      const transactionData = {
        category_id: transactionForm.category_id,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description.trim(),
        transaction_date: transactionForm.transaction_date + 'T12:00:00.000Z',
        vendor_name: transactionForm.vendor_name?.trim() || undefined,
        transaction_type: transactionForm.transaction_type,
        currency: 'EUR'
      }

      await transactionAPI.updateTransaction(selectedTransaction.id, transactionData)
      
      setShowEditModal(false)
      setSelectedTransaction(null)
      fetchTransactions()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update transaction')
    }
  }

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return

    try {
      await transactionAPI.deleteTransaction(selectedTransaction.id)
      setShowDeleteModal(false)
      setSelectedTransaction(null)
      setTransactionDetails(null)
      fetchTransactions()
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete transaction')
    }
  }

  const resetForm = () => {
    setTransactionForm({
      category_id: '',
      amount: '',
      description: '',
      transaction_date: new Date().toISOString().split('T')[0],
      vendor_name: '',
      transaction_type: 'expense'
    })
  }

  const openAddModal = () => {
    resetForm()
    setShowAddModal(true)
  }

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setTransactionForm({
      category_id: transaction.category_id || '',
      amount: transaction.amount.toString(),
      description: transaction.description,
      transaction_date: transaction.transaction_date.split('T')[0],
      vendor_name: transaction.vendor_name || '',
      transaction_type: transaction.transaction_type
    })
    setShowEditModal(true)
  }

  const handleViewTransactionDetails = async (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setTransactionDetails(null)
    
    try {
      const response = await transactionAPI.getTransaction(transaction.id)
      const transactionDetailData = response.data?.data || response.data || {}
      console.log('Transaction details response:', response)
      console.log('Transaction detail data:', transactionDetailData)
      console.log('Receipt details:', transactionDetailData.receipt_details)
      console.log('Receipt items:', transactionDetailData.receipt_details?.items)
      console.log('Receipt items length:', transactionDetailData.receipt_details?.items?.length)
      setTransactionDetails(transactionDetailData)
    } catch (error) {
      console.error('Failed to fetch transaction details:', error)
      setTransactionDetails(null)
    }
  }


  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(v => v !== '').length
  }

  const clearAllFilters = () => {
    setFilters({
      category: '',
      type: '',
      startDate: '',
      endDate: ''
    })
  }

  const getTransactionTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionTypeSign = (type: string) => {
    return type === 'income' ? '+' : '-'
  }

  const columns = [
    {
      key: 'transaction_date',
      header: 'Date',
      render: (item: Transaction) => format(new Date(item.transaction_date), 'MMM dd, yyyy')
    },
    {
      key: 'description',
      header: 'Description',
      render: (item: Transaction) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{item.description}</div>
          {(item.vendor_name || item.merchant_name) && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {item.vendor_name || item.merchant_name}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category_name',
      header: 'Category',
      render: (item: Transaction) => (
        <StatusBadge 
          status={item.category_name || 'Uncategorized'} 
          variant="info"
        />
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: Transaction) => (
        <span className={`font-medium ${getTransactionTypeColor(item.transaction_type)}`}>
          {getTransactionTypeSign(item.transaction_type)}{formatAmount(item.amount)}
        </span>
      )
    },
    {
      key: 'transaction_type',
      header: 'Type',
      render: (item: Transaction) => (
        <span className="capitalize">{item.transaction_type}</span>
      )
    }
  ]

  const categoryOptions = categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }))

  const typeOptions = [
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' }
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground">View and manage your financial transactions</p>
        </div>
        <button 
          onClick={openAddModal}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Transaction</span>
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
            showFilters 
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100' 
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Filter {getActiveFiltersCount() > 0 && `(${getActiveFiltersCount()})`}
        </button>
        
        {getActiveFiltersCount() > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Clear
          </button>
        )}
      </div>

      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FormField
              label="Type"
              name="type"
              type="select"
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              options={[{ value: '', label: 'All Types' }, ...typeOptions]}
            />
            <FormField
              label="Category"
              name="category"
              type="select"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              options={[{ value: '', label: 'All Categories' }, ...categoryOptions]}
            />
            <FormField
              label="Start Date"
              name="startDate"
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <FormField
              label="End Date"
              name="endDate"
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <Table
        data={transactions}
        columns={columns}
        loading={isLoading}
        onRowClick={handleViewTransactionDetails}
        emptyState={{
          title: 'No transactions found',
          description: 'Start by adding your first transaction',
          icon: (
            <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
          action: {
            label: 'Add Transaction',
            onClick: openAddModal
          }
        }}
      />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={setCurrentPage}
          itemsPerPage={10}
        />
      )}

      {/* Add Transaction Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Transaction"
        size="md"
      >
        <form onSubmit={handleCreateTransaction} className="space-y-4">
          <FormField
            label="Type"
            name="transaction_type"
            type="select"
            value={transactionForm.transaction_type}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_type: e.target.value as 'income' | 'expense' }))}
            options={typeOptions}
          />
          <FormField
            label="Category"
            name="category_id"
            type="select"
            value={transactionForm.category_id}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, category_id: e.target.value }))}
            options={categoryOptions}
            required
          />
          <FormField
            label="Amount"
            name="amount"
            type="number"
            value={transactionForm.amount}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            required
          />
          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={transactionForm.description}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Transaction description"
            required
          />
          <FormField
            label="Merchant/Vendor"
            name="vendor_name"
            value={transactionForm.vendor_name}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, vendor_name: e.target.value }))}
            placeholder="Merchant name"
          />
          <FormField
            label="Date"
            name="transaction_date"
            type="date"
            value={transactionForm.transaction_date}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_date: e.target.value }))}
          />
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Add Transaction
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
      </Modal>

      {/* Edit Transaction Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Transaction"
        size="md"
      >
        <form onSubmit={handleUpdateTransaction} className="space-y-4">
          <FormField
            label="Type"
            name="transaction_type"
            type="select"
            value={transactionForm.transaction_type}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_type: e.target.value as 'income' | 'expense' }))}
            options={typeOptions}
          />
          <FormField
            label="Category"
            name="category_id"
            type="select"
            value={transactionForm.category_id}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, category_id: e.target.value }))}
            options={categoryOptions}
            required
          />
          <FormField
            label="Amount"
            name="amount"
            type="number"
            value={transactionForm.amount}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            required
          />
          <FormField
            label="Description"
            name="description"
            type="textarea"
            value={transactionForm.description}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Transaction description"
            required
          />
          <FormField
            label="Merchant"
            name="vendor_name"
            value={transactionForm.vendor_name}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, vendor_name: e.target.value }))}
            placeholder="Merchant name"
          />
          <FormField
            label="Date"
            name="transaction_date"
            type="date"
            value={transactionForm.transaction_date}
            onChange={(e) => setTransactionForm(prev => ({ ...prev, transaction_date: e.target.value }))}
          />
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Update Transaction
            </button>
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedTransaction(null)
            setTransactionDetails(null)
          }}
          title="Transaction Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Transaction Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                <p className={`text-lg font-semibold ${getTransactionTypeColor(selectedTransaction.transaction_type)}`}>
                  {getTransactionTypeSign(selectedTransaction.transaction_type)}{formatAmount(selectedTransaction.amount)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <p className="text-gray-900 dark:text-white capitalize">{selectedTransaction.transaction_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                <p className="text-gray-900 dark:text-white">{format(new Date(selectedTransaction.transaction_date), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <p className="text-gray-900 dark:text-white">{selectedTransaction.category_name || 'Uncategorized'}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <p className="text-gray-900 dark:text-white">{selectedTransaction.description}</p>
            </div>

            {(selectedTransaction.vendor_name || selectedTransaction.merchant_name) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Merchant</label>
                <p className="text-gray-900 dark:text-white">{selectedTransaction.vendor_name || selectedTransaction.merchant_name}</p>
              </div>
            )}

            {/* Receipt Upload */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Receipt</h4>
              <ReceiptUpload
                transactionId={selectedTransaction.id}
                onUpload={(receiptUrl) => {
                  // Update the transaction with new receipt URL
                  setSelectedTransaction(prev => prev ? {
                    ...prev,
                    receipt_url: receiptUrl
                  } : null);
                  // Refresh transaction details
                  handleViewTransactionDetails(selectedTransaction);
                }}
                onDelete={() => {
                  // Remove receipt URL from transaction
                  setSelectedTransaction(prev => prev ? {
                    ...prev,
                    receipt_url: undefined
                  } : null);
                  // Refresh transaction details
                  handleViewTransactionDetails(selectedTransaction);
                }}
                currentReceiptUrl={selectedTransaction.receipt_url}
              />
            </div>

            {/* Receipt Information Section */}
            {(() => {
              console.log('Receipt render check:')
              console.log('transactionDetails:', transactionDetails)
              console.log('transactionDetails?.receipt_details:', transactionDetails?.receipt_details)
              console.log('transactionDetails?.receipt_details?.items:', transactionDetails?.receipt_details?.items)
              console.log('Array.isArray(items):', Array.isArray(transactionDetails?.receipt_details?.items))
              console.log('items.length:', transactionDetails?.receipt_details?.items?.length)
              return null
            })()}
            {transactionDetails?.receipt_details && transactionDetails.receipt_details.items && transactionDetails.receipt_details.items.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Receipt Items</h4>
                
                <div className="space-y-3">
                  {transactionDetails.receipt_details.items.map((item: { id: string; name: string; quantity: number; price: number; amount: number }, index: number) => (
                    <div key={item.id || index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.quantity} × €{item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          €{item.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                    <div className="flex justify-between items-center font-medium">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Total Items:</span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {transactionDetails.receipt_details.items.length} items
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Legacy OCR Data (fallback) */}
            {transactionDetails?.receipt_details?.extractedText && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Receipt Information</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {transactionDetails.receipt_details.extractedText}
                  </pre>
                </div>
              </div>
            )}

            {/* Display uploaded receipt image */}
            {selectedTransaction.receipt_url && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Uploaded Receipt</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  {selectedTransaction.receipt_url.endsWith('.pdf') ? (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <FileText className="w-4 h-4" />
                      <a
                        href={`http://localhost:3000${selectedTransaction.receipt_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm hover:underline"
                      >
                        View PDF Receipt
                      </a>
                    </div>
                  ) : (
                    <img
                      src={`http://localhost:3000${selectedTransaction.receipt_url}`}
                      alt="Receipt"
                      className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600"
                      style={{ maxHeight: '400px' }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  const transactionToEdit = selectedTransaction
                  setSelectedTransaction(null)
                  setTransactionDetails(null)
                  openEditModal(transactionToEdit)
                }}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors w-full sm:w-auto"
              >
                Edit Transaction
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(true)
                }}
                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors w-full sm:w-auto"
              >
                Delete Transaction
              </button>
              <button
                onClick={() => {
                  setSelectedTransaction(null)
                  setTransactionDetails(null)
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full sm:w-auto"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
