import React, { useState, useEffect, useRef } from 'react'
import { chatAPI, ChatMessage } from '../lib/api'
import { ChatHeader } from '../components/chat/ChatHeader'
import { MessageList } from '../components/chat/MessageList'
import { ChatInput } from '../components/chat/ChatInput'
import { ClearHistoryModal } from '../components/chat/ClearHistoryModal'
import { StreamingPhase, detectStreamingPhase } from '../components/chat/StreamingIndicator'
import { generateContextualRecommendations } from '../components/chat/RecommendationCards'

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingPhase, setStreamingPhase] = useState<StreamingPhase>('thinking')
  const [statusMessage, setStatusMessage] = useState('')
  const [recommendations, setRecommendations] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cleanupStreamRef = useRef<(() => void) | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleRecommendationClick = (recommendation: string) => {
    if (isLoading || isStreaming) return
    
    setError(null)
    setIsStreaming(true)
    setStreamingResponse('')
    setStreamingPhase('thinking')
    setStatusMessage('')
    setRecommendations([]) // Clear current recommendations

    // Add user message to chat immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_message: recommendation,
      ai_response: '',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])

    // Start streaming for the recommendation
    cleanupStreamRef.current = chatAPI.sendMessageStream(
      recommendation,
      // onChunk
      (chunk: string) => {
        setStreamingResponse(prev => {
          const newResponse = prev + chunk
          setStreamingPhase(detectStreamingPhase(newResponse))
          return newResponse
        })
      },
      // onComplete
      async (fullResponse: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        setStreamingPhase('thinking')
        setStatusMessage('')
        
        // Update with complete response
        setMessages(prev => [
          ...prev.slice(0, -1), // Remove temp message
          {
            id: `chat-${Date.now()}`,
            user_message: recommendation,
            ai_response: fullResponse,
            created_at: new Date().toISOString()
          }
        ])
        
        // Generate contextual recommendations
        const newRecommendations = generateContextualRecommendations(recommendation, fullResponse)
        setRecommendations(newRecommendations)
        
        cleanupStreamRef.current = null
      },
      // onError
      (errorMessage: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        setStreamingPhase('thinking')
        setStatusMessage('')
        setError(errorMessage)
        
        // Remove the temp message on error
        setMessages(prev => prev.slice(0, -1))
        
        cleanupStreamRef.current = null
      },
      // onStatus
      (status: string) => {
        setStatusMessage(status)
        // Update streaming phase based on status message
        if (status.includes('🔍') || status.includes('Looking up')) {
          setStreamingPhase('searching')
        } else if (status.includes('📊') || status.includes('Analyzing') || status.includes('formatting')) {
          setStreamingPhase('analyzing')
        } else if (status.includes('✅') || status.includes('Found')) {
          setStreamingPhase('responding')
        } else if (status.includes('Thinking')) {
          setStreamingPhase('thinking')
        }
      }
    )
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingResponse])

  useEffect(() => {
    console.log('🔧 [ChatPage] Component mounted, loading chat history...')
    loadChatHistory()

    // Cleanup on unmount
    return () => {
      if (cleanupStreamRef.current) {
        cleanupStreamRef.current()
      }
    }
  }, [])

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getChatHistory({ limit: 50 })
      console.log('🔍 [ChatPage] Chat history response:', response.data)
      
      // Handle different response structures
      const responseData = response.data?.data || response.data || {}
      const messages = responseData.messages || responseData || []
      
      // Map backend field names to frontend interface
      const chatMessages = Array.isArray(messages) ? messages.map(msg => ({
        id: msg.id,
        user_message: msg.message || msg.user_message,
        ai_response: msg.response || msg.ai_response,
        created_at: msg.created_at
      })).reverse() : [] // Reverse to show oldest first
      
      console.log('🔍 [ChatPage] Processed chat messages:', chatMessages)
      setMessages(chatMessages)
      
      // If there are messages, generate recommendations based on the last conversation
      if (chatMessages.length > 0) {
        const lastMessage = chatMessages[chatMessages.length - 1]
        if (lastMessage.ai_response) {
          const newRecommendations = generateContextualRecommendations(
            lastMessage.user_message, 
            lastMessage.ai_response
          )
          setRecommendations(newRecommendations)
        }
      }
    } catch (error: any) {
      console.error('Failed to load chat history:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading || isStreaming) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setError(null)
    setIsStreaming(true)
    setStreamingResponse('')
    setStreamingPhase('thinking')
    setStatusMessage('')
    setRecommendations([]) // Clear current recommendations

    // Add user message to chat immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_message: userMessage,
      ai_response: '',
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMessage])

    // Start streaming
    cleanupStreamRef.current = chatAPI.sendMessageStream(
      userMessage,
      // onChunk
      (chunk: string) => {
        setStreamingResponse(prev => {
          const newResponse = prev + chunk
          setStreamingPhase(detectStreamingPhase(newResponse))
          return newResponse
        })
      },
      // onComplete
      async (fullResponse: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        setStreamingPhase('thinking')
        
        // Update with complete response
        setMessages(prev => [
          ...prev.slice(0, -1), // Remove temp message
          {
            id: `chat-${Date.now()}`,
            user_message: userMessage,
            ai_response: fullResponse,
            created_at: new Date().toISOString()
          }
        ])
        
        // Generate contextual recommendations
        const newRecommendations = generateContextualRecommendations(userMessage, fullResponse)
        setRecommendations(newRecommendations)
        
        cleanupStreamRef.current = null
      },
      // onError
      (errorMessage: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        setStreamingPhase('thinking')
        setStatusMessage('')
        setError(errorMessage)
        
        // Remove the temp message on error
        setMessages(prev => prev.slice(0, -1))
        
        cleanupStreamRef.current = null
      },
      // onStatus
      (status: string) => {
        setStatusMessage(status)
        // Update streaming phase based on status message
        if (status.includes('🔍') || status.includes('Looking up')) {
          setStreamingPhase('searching')
        } else if (status.includes('📊') || status.includes('Analyzing') || status.includes('formatting')) {
          setStreamingPhase('analyzing')
        } else if (status.includes('✅') || status.includes('Found')) {
          setStreamingPhase('responding')
        } else if (status.includes('Thinking')) {
          setStreamingPhase('thinking')
        }
      }
    )
  }

  const handleClearHistory = () => {
    console.log('🚀 [Frontend] Clear History button clicked!')
    setShowClearModal(true)
  }

  const confirmClearHistory = async () => {
    try {
      console.log('🔍 [Frontend] Attempting to clear chat history')
      const response = await chatAPI.clearChatHistory()
      console.log('✅ [Frontend] Clear response:', response)
      setMessages([])
      setRecommendations([]) // Clear recommendations when clearing history
      setError(null) // Clear any previous errors
      setShowClearModal(false)
    } catch (error: any) {
      console.error('❌ [Frontend] Clear error:', error)
      console.error('❌ [Frontend] Error response:', error.response)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to clear chat history'
      setError(errorMessage)
    }
  }

  const cancelClear = () => {
    console.log('⚠️ [Frontend] Clear cancelled by user')
    setShowClearModal(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <ChatHeader error={error} />

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingResponse={streamingResponse}
            streamingPhase={streamingPhase}
            statusMessage={statusMessage}
            recommendations={recommendations}
            isLoading={isLoading}
            onRecommendationClick={handleRecommendationClick}
            messagesEndRef={messagesEndRef}
          />
        </div>

        {/* Input Area */}
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          isStreaming={isStreaming}
          messageCount={messages.length}
          onClearHistory={handleClearHistory}
        />
      </div>

      {/* Clear History Modal */}
      <ClearHistoryModal
        show={showClearModal}
        onConfirm={confirmClearHistory}
        onCancel={cancelClear}
      />
    </div>
  )
}