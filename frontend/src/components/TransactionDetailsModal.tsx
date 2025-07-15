import React from 'react'
import { format } from 'date-fns'
import { useCurrency } from '../contexts/CurrencyContext'

interface ReceiptItem {
  id: string
  name: string
  quantity: number
  price: number
  amount: number
}

interface ReceiptDetails {
  items?: ReceiptItem[]
  total_items?: number
  source?: string
  extractedText?: string
}

interface TransactionDetails {
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
  receipt_details?: ReceiptDetails
}

interface TransactionDetailsModalProps {
  transaction: TransactionDetails
  isOpen: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  const { formatAmount } = useCurrency()

  if (!isOpen) return null

  const getTransactionTypeColor = (type: string) => {
    return type === 'income' ? 'text-green-600' : 'text-red-600'
  }

  const getTransactionTypeSign = (type: string) => {
    return type === 'income' ? '+' : '-'
  }

  const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount

  return (
    <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Transaction Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Transaction Info */}
          <div className="space-y-6">
            {/* Amount and Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
                <p className={`text-2xl font-bold ${getTransactionTypeColor(transaction.transaction_type)}`}>
                  {getTransactionTypeSign(transaction.transaction_type)}{formatAmount(amount)}
                </p>
                {transaction.tax_amount && parseFloat(transaction.tax_amount.toString()) > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Tax: {formatAmount(parseFloat(transaction.tax_amount.toString()))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  transaction.transaction_type === 'income' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                </span>
              </div>
            </div>

            {/* Date and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                <p className="text-gray-900 dark:text-white">{format(new Date(transaction.transaction_date), 'MMMM dd, yyyy')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {transaction.category_name || 'Uncategorized'}
                </span>
              </div>
            </div>

            {/* Description and Vendor */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <p className="text-gray-900 dark:text-white">{transaction.description}</p>
              </div>
              {transaction.vendor_name && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vendor/Merchant</label>
                  <p className="text-gray-900 dark:text-white font-medium">{transaction.vendor_name}</p>
                </div>
              )}
            </div>

            {/* Receipt Line Items */}
            {transaction.receipt_details?.items && transaction.receipt_details.items.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Receipt Items</h4>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {transaction.receipt_details.items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-center">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right">
                            {formatAmount(item.price)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                            {formatAmount(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                          Total ({transaction.receipt_details.total_items || transaction.receipt_details.items.length} items)
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">
                          {formatAmount(amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* OCR Extracted Text */}
            {transaction.receipt_details?.extractedText && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">OCR Extracted Text</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Raw receipt data</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {transaction.receipt_details.extractedText}
                  </pre>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Created: {format(new Date(transaction.created_at), 'PPp')}</span>
                {transaction.updated_at !== transaction.created_at && (
                  <span>Updated: {format(new Date(transaction.updated_at), 'PPp')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-between">
          <button
            onClick={onDelete}
            className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            Delete Transaction
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}