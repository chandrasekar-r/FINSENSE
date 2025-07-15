import React from 'react'
import { useCurrency } from '../../../contexts/CurrencyContext'

interface ReceiptItem {
  item_name: string
  quantity: number
  price: number
  total: number
  category?: string
}

interface ReceiptDetailsData {
  merchant: string
  date: string
  total_amount: number
  currency: string
  items: ReceiptItem[]
}

interface ReceiptDetailsContent {
  message?: string
  data: ReceiptDetailsData
}

interface ReceiptDetailsRendererProps {
  content: ReceiptDetailsContent
}

export const ReceiptDetailsRenderer: React.FC<ReceiptDetailsRendererProps> = ({ content }) => {
  const { formatAmount } = useCurrency()
  const { message, data } = content
  const { merchant, date, total_amount, currency, items } = data

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const totalCalculated = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-6">
      {/* Original message if provided */}
      {message && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{message}</p>
        </div>
      )}

      {/* Receipt Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{merchant}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(date)}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatAmount(total_amount)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Amount</div>
          </div>
        </div>
      </div>

      {/* Receipt Items */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Receipt Items</h4>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item, index) => (
            <div key={index} className="px-6 py-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.item_name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.quantity} × {formatAmount(item.price)} = {formatAmount(item.total)}
                  </div>
                  {item.category && (
                    <div className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mt-1">
                      {item.category}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {formatAmount(item.total)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex justify-between items-center font-semibold">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-xl text-orange-600 dark:text-orange-400">
              {formatAmount(totalCalculated)}
            </span>
          </div>
        </div>
      </div>

      {/* Receipt Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
          <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Items</div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{items.length}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
          <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Currency</div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">{currency}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
          <div className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">Categories</div>
          <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
            {new Set(items.map(item => item.category).filter(Boolean)).size}
          </div>
        </div>
      </div>
    </div>
  )
}