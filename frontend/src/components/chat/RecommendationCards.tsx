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
  
  // Dynamic recommendation generation based on AI response content
  const responseText = lastResponse.toLowerCase()
  
  // Grocery and meal planning insights
  if (responseText.includes('grocery') || responseText.includes('food') || responseText.includes('meal')) {
    recommendations.push("Show me my grocery spending breakdown")
    recommendations.push("Compare my grocery costs to eating out")
    recommendations.push("Find cheaper alternatives for my frequent grocery items")
  }
  
  // Budget optimization insights
  if (responseText.includes('budget') || responseText.includes('overspent') || responseText.includes('remaining')) {
    recommendations.push("Which budget category should I reduce?")
    recommendations.push("Show me my top spending categories")
    recommendations.push("How can I optimize my grocery budget?")
  }
  
  // Receipt analysis insights
  if (responseText.includes('receipt') || responseText.includes('items') || responseText.includes('purchased')) {
    recommendations.push("Analyze my most expensive receipt items")
    recommendations.push("Find duplicate purchases I can avoid")
    recommendations.push("Compare prices across different stores")
  }
  
  // Category spending insights
  if (responseText.includes('category') || responseText.includes('spending') || responseText.includes('expensive')) {
    recommendations.push("Which categories are eating my budget?")
    recommendations.push("Show seasonal trends in my spending")
    recommendations.push("Identify my impulse purchases")
  }
  
  // Transaction pattern analysis
  if (responseText.includes('transaction') || responseText.includes('pattern') || responseText.includes('weekly')) {
    recommendations.push("Show me my weekend vs weekday spending")
    recommendations.push("Find my most frequent merchants")
    recommendations.push("Track my subscription spending")
  }
  
  // Financial optimization queries
  if (responseText.includes('save') || responseText.includes('reduce') || responseText.includes('cut')) {
    recommendations.push("Where can I cut $50 from my monthly spending?")
    recommendations.push("Show me my recurring charges to cancel")
    recommendations.push("Compare my spending to similar budgets")
  }
  
  // Advanced receipt insights
  if (responseText.includes('brand') || responseText.includes('generic') || responseText.includes('unit price')) {
    recommendations.push("Find generic alternatives to save money")
    recommendations.push("Calculate bulk purchase savings")
    recommendations.push("Track price changes on my frequent items")
  }
  
  // Meal planning optimization
  if (message.includes('meal') || message.includes('plan') || response.includes('cook')) {
    recommendations.push("Plan meals based on my grocery receipts")
    recommendations.push("Calculate cost per meal from my purchases")
    recommendations.push("Identify ingredients I'm wasting")
  }
  
  // Smart fallback recommendations based on actual user data context
  if (recommendations.length < 3) {
    const smartRecommendations = [
      "What are my most expensive grocery items?",
      "Show me my food waste patterns from receipts",
      "Compare my grocery spending to budget",
      "Find cheaper alternatives for my regular purchases",
      "Analyze my bulk vs single item savings",
      "Track seasonal price changes on my groceries",
      "Identify subscription services I can cancel",
      "Compare store prices for my frequent items",
      "Calculate my weekly food cost per person",
      "Find duplicate purchases across receipts"
    ]
    
    // Select contextually relevant recommendations
    const shuffled = smartRecommendations.sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 3 - recommendations.length)
    recommendations.push(...selected)
  }
  
  return recommendations.slice(0, 3)
}