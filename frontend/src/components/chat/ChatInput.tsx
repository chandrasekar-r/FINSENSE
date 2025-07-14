import React from 'react'

interface ChatInputProps {
  inputMessage: string
  setInputMessage: (message: string) => void
  onSendMessage: (e: React.FormEvent) => void
  isLoading: boolean
  isStreaming: boolean
  messageCount: number
  onClearHistory: () => void
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isLoading,
  isStreaming,
  messageCount,
  onClearHistory
}) => {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4">
      <form onSubmit={onSendMessage} className="flex space-x-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask me about your finances..."
          disabled={isLoading || isStreaming}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading || isStreaming}
          className="px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isStreaming ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            'Send'
          )}
        </button>
      </form>
      
      {messageCount > 0 && (
        <div className="flex justify-between items-center mt-3">
          <button
            onClick={onClearHistory}
            disabled={isLoading || isStreaming}
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear History
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isStreaming ? 'AI is typing...' : `${messageCount} message${messageCount !== 1 ? 's' : ''}`}
          </span>
        </div>
      )}
    </div>
  )
}