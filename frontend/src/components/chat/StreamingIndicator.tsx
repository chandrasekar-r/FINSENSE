import React from 'react'

export type StreamingPhase = 'thinking' | 'searching' | 'analyzing' | 'responding'

interface StreamingIndicatorProps {
  phase: StreamingPhase
  statusMessage?: string
}

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = ({ phase, statusMessage }) => {
  const indicators = {
    thinking: {
      icon: '🤔',
      text: 'AI is thinking...',
      color: 'text-gray-500 dark:text-gray-400'
    },
    searching: {
      icon: '🔍',
      text: 'Looking up your financial data...',
      color: 'text-blue-500 dark:text-blue-400'
    },
    analyzing: {
      icon: '📊',
      text: 'Analyzing and formatting results...',
      color: 'text-purple-500 dark:text-purple-400'
    },
    responding: {
      icon: '✨',
      text: 'Generating response...',
      color: 'text-green-500 dark:text-green-400'
    }
  }
  
  const indicator = indicators[phase]

  return (
    <div className="flex items-center space-x-3">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className={`flex items-center space-x-2 ${indicator.color}`}>
        <span>{indicator.icon}</span>
        <span>{statusMessage || indicator.text}</span>
      </span>
    </div>
  )
}

export const detectStreamingPhase = (content: string): StreamingPhase => {
  if (content.includes('🔍') || content.includes('Looking up')) {
    return 'searching'
  } else if (content.includes('✅') || content.includes('Found')) {
    return 'responding'
  } else if (content.includes('📊') || content.includes('Analyzing') || content.includes('formatting')) {
    return 'analyzing'
  } else if (content.includes('{') || content.includes('"type"') || content.length > 100) {
    return 'responding'
  }
  return 'thinking'
}