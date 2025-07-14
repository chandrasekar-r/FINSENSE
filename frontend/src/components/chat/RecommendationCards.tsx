import React from 'react'

interface RecommendationCardsProps {
  recommendations: string[]
  onRecommendationClick: (recommendation: string) => void
  isLoading: boolean
  isStreaming: boolean
  variant?: 'initial' | 'contextual'
}

export const RecommendationCards: React.FC<RecommendationCardsProps> = ({
  recommendations,
  onRecommendationClick,
  isLoading,
  isStreaming,
  variant = 'contextual'
}) => {
  if (recommendations.length === 0) return null

  if (variant === 'initial') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
        {recommendations.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onRecommendationClick(suggestion)}
            disabled={isLoading || isStreaming}
            className="p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try these suggestions:</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {recommendations.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onRecommendationClick(suggestion)}
            disabled={isLoading || isStreaming}
            className="p-2 text-left bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-md border border-gray-200 dark:border-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
              <span className="text-xs text-gray-700 dark:text-gray-300">{suggestion}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export const getInitialRecommendations = (): string[] => [
  "How much did I spend this month?",
  "Show me my recent transactions",
  "How am I doing with my budgets?",
  "Add a $50 grocery expense from today",
  "Create a new budget for dining out",
  "What's my biggest expense category?"
]

export const generateContextualRecommendations = (lastMessage: string, lastResponse: string): string[] => {
  const message = lastMessage.toLowerCase()
  const response = lastResponse.toLowerCase()
  
  const recommendations: string[] = []
  
  // Budget-related recommendations
  if (message.includes('budget') || response.includes('budget')) {
    recommendations.push("Create a new budget for a category")
    recommendations.push("Show me my budget performance")
    recommendations.push("Update my existing budgets")
  }
  
  // Transaction-related recommendations
  if (message.includes('transaction') || message.includes('spend') || response.includes('transaction')) {
    recommendations.push("Add a new expense transaction")
    recommendations.push("Show me transactions from last week")
    recommendations.push("Delete an incorrect transaction")
  }
  
  // Analysis-related recommendations
  if (message.includes('analysis') || message.includes('summary') || response.includes('analysis')) {
    recommendations.push("Get my spending analysis for this year")
    recommendations.push("Compare this month to last month")
    recommendations.push("Show me category breakdown")
  }
  
  // Category-related recommendations
  if (message.includes('category') || response.includes('category')) {
    recommendations.push("Create a new spending category")
    recommendations.push("Show me spending by category")
    recommendations.push("Update transaction categories")
  }
  
  // Receipt-related recommendations
  if (message.includes('receipt') || message.includes('items') || response.includes('receipt')) {
    recommendations.push("Show me receipt items from another purchase")
    recommendations.push("Update incorrect receipt items")
    recommendations.push("Show me recent receipts")
  }
  
  // Add general recommendations if we don't have enough specific ones
  if (recommendations.length < 3) {
    const general = [
      "Show me my recent transactions",
      "How am I doing with my budgets?",
      "What's my total spending this month?",
      "Add a new expense",
      "Create a budget for a category",
      "Get my financial summary"
    ]
    
    general.forEach(rec => {
      if (!recommendations.includes(rec) && recommendations.length < 3) {
        recommendations.push(rec)
      }
    })
  }
  
  return recommendations.slice(0, 3)
}