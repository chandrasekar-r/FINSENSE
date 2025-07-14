import React from 'react'

interface ChatHeaderProps {
  error?: string | null
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ error }) => {
  return (
    <>
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Financial Assistant</h1>
        <p className="text-gray-600 dark:text-gray-400">Ask questions about your spending, budgets, and financial insights</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </>
  )
}