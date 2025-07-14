import React from 'react'
import { ChatMessage } from '../../lib/api'
import { MessageFormatter } from './MessageFormatter'
import { StreamingIndicator, StreamingPhase } from './StreamingIndicator'
import { RecommendationCards, getInitialRecommendations } from './RecommendationCards'

interface MessageListProps {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingResponse: string
  streamingPhase: StreamingPhase
  statusMessage: string
  recommendations: string[]
  isLoading: boolean
  onRecommendationClick: (recommendation: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement>
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  streamingResponse,
  streamingPhase,
  statusMessage,
  recommendations,
  isLoading,
  onRecommendationClick,
  messagesEndRef
}) => {
  if (messages.length === 0) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Start a conversation</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">Ask me about your spending patterns, budget status, or any financial questions!</p>
        
        {/* Initial Suggestion Cards */}
        <RecommendationCards
          recommendations={getInitialRecommendations()}
          onRecommendationClick={onRecommendationClick}
          isLoading={isLoading}
          isStreaming={isStreaming}
          variant="initial"
        />
      </div>
    )
  }

  return (
    <>
      {messages.map((message) => (
        <div key={message.id} className="space-y-4">
          {/* User Message */}
          <div className="flex justify-end">
            <div className="max-w-3xl bg-blue-600 dark:bg-blue-500 text-white rounded-lg px-4 py-2">
              <p className="text-sm">{message.user_message}</p>
            </div>
          </div>

          {/* AI Response */}
          {message.ai_response && (
            <div className="flex justify-start">
              <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <MessageFormatter text={message.ai_response} />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Streaming Response */}
      {isStreaming && (
        <div className="flex justify-start">
          <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {streamingResponse ? (
                <>
                  <MessageFormatter text={streamingResponse} isStreaming={true} />
                  <span className="inline-block w-2 h-4 bg-blue-500 dark:bg-blue-400 ml-1 animate-pulse rounded"></span>
                </>
              ) : (
                <StreamingIndicator phase={streamingPhase} statusMessage={statusMessage} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contextual Recommendations */}
      {recommendations.length > 0 && !isStreaming && (
        <RecommendationCards
          recommendations={recommendations}
          onRecommendationClick={onRecommendationClick}
          isLoading={isLoading}
          isStreaming={isStreaming}
          variant="contextual"
        />
      )}
      
      <div ref={messagesEndRef} />
    </>
  )
}