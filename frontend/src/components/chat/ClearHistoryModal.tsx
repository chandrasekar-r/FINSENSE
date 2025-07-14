import React from 'react'

interface ClearHistoryModalProps {
  show: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({ show, onConfirm, onCancel }) => {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4">Clear Chat History</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Are you sure you want to clear all chat history? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center space-x-3 mt-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
            >
              Clear History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}