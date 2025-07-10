import React, { useState, useEffect, useRef } from 'react'
import { chatAPI, ChatMessage } from '../lib/api'

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClearModal, setShowClearModal] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingPhase, setStreamingPhase] = useState<'thinking' | 'searching' | 'analyzing' | 'responding'>('thinking')
  const [recommendations, setRecommendations] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cleanupStreamRef = useRef<(() => void) | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Helper to log phase changes
  const updateStreamingPhase = (newContent: string) => {
    // Read current phase directly from state getter, as 'streamingPhase' variable might be stale in this closure
    setStreamingPhase(currentPhase => {
      const newPhase = detectStreamingPhase(newContent);
      if (currentPhase !== newPhase) {
        console.log(`[ChatPage.updateStreamingPhase] Phase changing from '${currentPhase}' to '${newPhase}'. Content snapshot for detection:`, newContent.slice(-200)); // Log last 200 chars
      }
      return newPhase;
    });
  };

  const detectStreamingPhase = (content: string) => {
    if (content.includes('🔍 Looking up')) {
      return 'searching'
    } else if (content.includes('✅ Found')) {
      return 'searching'
    } else if (content.includes('📊 Analyzing')) {
      return 'analyzing'
    } else if (content.includes('{') || content.includes('"type"')) {
      return 'responding'
    }
    return 'thinking'
  }

  const getStreamingIndicator = () => {
    const indicators = {
      thinking: {
        icon: '🤔',
        text: 'AI is thinking...',
        color: 'text-gray-500 dark:text-gray-400'
      },
      searching: {
        icon: '🔍',
        text: 'Searching your data...',
        color: 'text-blue-500 dark:text-blue-400'
      },
      analyzing: {
        icon: '📊',
        text: 'Analyzing and formatting...',
        color: 'text-purple-500 dark:text-purple-400'
      },
      responding: {
        icon: '✨',
        text: 'Generating response...',
        color: 'text-green-500 dark:text-green-400'
      }
    }
    
    return indicators[streamingPhase]
  }

  const getInitialRecommendations = () => [
    "How much did I spend this month?",
    "Show me my recent transactions",
    "How am I doing with my budgets?",
    "Add a $50 grocery expense from today",
    "Create a new budget for dining out",
    "What's my biggest expense category?"
  ]

  const generateContextualRecommendations = (lastMessage: string, lastResponse: string): string[] => {
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

  const handleRecommendationClick = (recommendation: string) => {
    if (isLoading || isStreaming) return
    
    setError(null)
    setIsStreaming(true)
    setStreamingResponse('')
    setStreamingPhase('thinking'); console.log("[ChatPage.handleRecommendationClick] Set phase to 'thinking'");
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
          updateStreamingPhase(newResponse); // Use new helper for logging
          return newResponse
        })
      },
      // onComplete
      (fullResponse: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        setStreamingPhase('thinking'); console.log("[ChatPage.handleRecommendationClick/onComplete] Reset phase to 'thinking'");
        
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
        setStreamingPhase('thinking'); console.log("[ChatPage.handleRecommendationClick/onError] Reset phase to 'thinking'");
        setError(errorMessage)
        
        // Remove the temp message on error
        setMessages(prev => prev.slice(0, -1))
        
        cleanupStreamRef.current = null
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
      const chatMessages = response.data.data.messages.reverse() // Reverse to show oldest first
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
    setStreamingPhase('thinking'); console.log("[ChatPage.handleSendMessage] Set phase to 'thinking'");
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
          updateStreamingPhase(newResponse); // Use new helper for logging
          return newResponse
        })
      },
      // onComplete
      (fullResponse: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        setStreamingPhase('thinking'); console.log("[ChatPage.handleSendMessage/onComplete] Reset phase to 'thinking'");
        
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
        setStreamingPhase('thinking'); console.log("[ChatPage.handleSendMessage/onError] Reset phase to 'thinking'");
        setError(errorMessage)
        
        // Remove the temp message on error
        setMessages(prev => prev.slice(0, -1))
        
        cleanupStreamRef.current = null
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

  const formatMessage = (text: string) => {
    console.log('[ChatPage.formatMessage] Input text:', text); // Log input

    // Check if the response contains JSON structured data
    try {
      // First, try to parse the entire text as JSON
      const trimmedText = text.trim();
      if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
        console.log('[ChatPage.formatMessage] Attempting to parse entire text as JSON.');
        const jsonResponse = JSON.parse(trimmedText);
        if (jsonResponse.type && jsonResponse.content) {
          console.log('[ChatPage.formatMessage] Successfully parsed entire text as JSON:', jsonResponse);
          return renderStructuredResponse(jsonResponse);
        }
      }
      
      // Then, try to find JSON-like structure embedded in the text
      const jsonPatterns = [
        /\{"type":\s*"[^"]+",\s*"content":\s*\{[^}]*\}[^}]*\}/g, // More specific
        // /\{"type":[^}]*\}/g // This one is too broad and can cause issues, consider removing or making more specific
      ];
      
      for (const pattern of jsonPatterns) {
        console.log('[ChatPage.formatMessage] Trying pattern:', pattern);
        const matches = text.match(pattern);
        if (matches) {
          console.log('[ChatPage.formatMessage] Found matches with pattern:', matches);
          for (const match of matches) {
            console.log('[ChatPage.formatMessage] Attempting to parse match:', match);
            try {
              const jsonResponse = JSON.parse(match);
              if (jsonResponse.type && jsonResponse.content) {
                console.log('[ChatPage.formatMessage] Successfully parsed match as JSON:', jsonResponse);
                // Split the response into parts: before JSON, JSON, and after JSON
                const beforeJson = text.substring(0, text.indexOf(match)).trim();
                const afterJson = text.substring(text.indexOf(match) + match.length).trim();
                
                return (
                  <div className="space-y-4">
                    {beforeJson && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {formatInlineText(beforeJson)}
                      </div>
                    )}
                    {renderStructuredResponse(jsonResponse)}
                    {afterJson && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {formatInlineText(afterJson)}
                      </div>
                    )}
                  </div>
                );
              }
            } catch (e) {
              console.warn('[ChatPage.formatMessage] Failed to parse regex match as JSON:', match, e);
              // Continue to next match
            }
          }
        }
      }
      
      // Manual JSON extraction with proper brace counting
      const jsonStart = text.indexOf('{"type":');
      if (jsonStart !== -1) {
        console.log('[ChatPage.formatMessage] Attempting manual JSON extraction starting at index:', jsonStart);
        // Extract potential JSON from the first opening brace to the end
        const potentialJson = text.substring(jsonStart);
        
        // Try to find the complete JSON object
        let braceCount = 0;
        let endIndex = -1;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < potentialJson.length; i++) {
          const char = potentialJson[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
          }
        }
        
        if (endIndex !== -1) {
          try {
            const jsonString = potentialJson.substring(0, endIndex + 1);
            console.log('[ChatPage.formatMessage] Manual extraction produced potential JSON string:', jsonString);
            const jsonResponse = JSON.parse(jsonString);
            if (jsonResponse.type && jsonResponse.content) {
              console.log('[ChatPage.formatMessage] Successfully parsed manually extracted JSON:', jsonResponse);
              // Split the response into parts: before JSON, JSON, and after JSON
              const beforeJson = text.substring(0, jsonStart).trim();
              const afterJson = text.substring(jsonStart + endIndex + 1).trim();
              
              return (
                <div className="space-y-4">
                  {beforeJson && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {formatInlineText(beforeJson)}
                    </div>
                  )}
                  {renderStructuredResponse(jsonResponse)}
                  {afterJson && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {formatInlineText(afterJson)}
                    </div>
                  )}
                </div>
              );
            }
          } catch (e) {
            console.warn('[ChatPage.formatMessage] Failed to parse manually extracted JSON string:', e);
            // JSON parsing failed, continue with markdown
          }
        } else {
          console.log('[ChatPage.formatMessage] Manual JSON extraction did not find a valid JSON object.');
        }
      }
    } catch (e) {
      console.warn('[ChatPage.formatMessage] Error during JSON processing:', e);
      // Not JSON, continue with markdown formatting
    }

    console.log('[ChatPage.formatMessage] No structured JSON found or failed to parse, formatting as markdown.');
    // Enhanced formatting for AI responses with comprehensive markdown support
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let inTable = false;
    let tableRows: string[] = [];
    
    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          elements.push(
            <div key={`code-${index}`} className="bg-gray-900 dark:bg-gray-800 rounded-lg p-4 my-3 overflow-x-auto">
              <pre className="text-sm text-gray-100 dark:text-gray-200">
                <code>{codeBlockLines.join('\n')}</code>
              </pre>
            </div>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          // Start code block
          inCodeBlock = true;
        }
        return;
      }
      
      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }
      
      // Handle tables
      if (line.includes('|') && line.split('|').length > 2) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
        return;
      } else if (inTable) {
        // End table
        elements.push(renderTable(tableRows, index));
        tableRows = [];
        inTable = false;
      }
      
      // Skip empty lines
      if (!line.trim()) {
        elements.push(<div key={index} className="h-2" />);
        return;
      }
      
      // Handle headers (# ## ###)
      if (line.startsWith('#')) {
        const headerLevel = line.match(/^#+/)?.[0].length || 1;
        const headerText = line.replace(/^#+\s*/, '');
        const headerClasses: Record<number, string> = {
          1: 'text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-4 first:mt-0',
          2: 'text-xl font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0',
          3: 'text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0',
          4: 'text-base font-semibold text-gray-900 dark:text-white mb-2 mt-2 first:mt-0',
          5: 'text-sm font-semibold text-gray-900 dark:text-white mb-1 mt-2 first:mt-0',
          6: 'text-xs font-semibold text-gray-900 dark:text-white mb-1 mt-2 first:mt-0'
        };
        const headerClass = headerClasses[headerLevel] || headerClasses[4];
        
        elements.push(
          React.createElement(`h${Math.min(headerLevel, 6)}`, {
            key: index,
            className: headerClass
          }, formatInlineText(headerText))
        );
        return;
      }
      
      // Handle headers (lines starting with ** and ending with **)
      if (line.startsWith('**') && line.endsWith('**')) {
        const headerText = line.slice(2, -2);
        elements.push(
          <h4 key={index} className="font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">
            {headerText}
          </h4>
        );
        return;
      }
      
      // Handle numbered lists
      if (line.trim().match(/^\d+\.\s/)) {
        const numberText = line.replace(/^\s*\d+\.\s*/, '');
        elements.push(
          <div key={index} className="flex items-start mb-1">
            <span className="text-blue-500 dark:text-blue-400 mr-2 mt-1 font-medium">
              {line.match(/^\s*(\d+)\./)?.[1]}.
            </span>
            <span className="flex-1">{formatInlineText(numberText)}</span>
          </div>
        );
        return;
      }
      
      // Handle bullet points
      if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
        const bulletText = line.replace(/^\s*[-•*]\s*/, '');
        elements.push(
          <div key={index} className="flex items-start mb-1">
            <span className="text-blue-500 dark:text-blue-400 mr-2 mt-1">•</span>
            <span className="flex-1">{formatInlineText(bulletText)}</span>
          </div>
        );
        return;
      }
      
      // Handle blockquotes
      if (line.trim().startsWith('>')) {
        const quoteText = line.replace(/^\s*>\s*/, '');
        elements.push(
          <div key={index} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-2 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
            <p className="text-gray-700 dark:text-gray-300 italic">
              {formatInlineText(quoteText)}
            </p>
          </div>
        );
        return;
      }
      
      // Handle regular paragraphs
      elements.push(
        <p key={index} className="mb-2 last:mb-0 text-gray-700 dark:text-gray-300 leading-relaxed">
          {formatInlineText(line)}
        </p>
      );
    });
    
    // Handle any remaining table
    if (inTable && tableRows.length > 0) {
      elements.push(renderTable(tableRows, lines.length));
    }
    
    return elements;
  }
  
  const renderStructuredResponse = (jsonResponse: any) => {
    const { type, content } = jsonResponse;
    
    switch (type) {
      case 'budget_breakdown':
      case 'budget_performance':
        return renderBudgetBreakdown(content);
      case 'spending_analysis':
        return renderSpendingAnalysis(content);
      case 'receipt_details':
        return renderReceiptDetails(content);
      case 'transaction_list':
        return renderTransactionList(content);
      case 'structured_response':
        return renderGenericStructuredResponse(content);
      default:
        // Fallback to regular markdown if unknown type
        return formatInlineText(JSON.stringify(jsonResponse, null, 2));
    }
  };

  const renderBudgetBreakdown = (content: any) => {
    const { message, data } = content;
    const { total_spent, total_budgeted, remaining_budget, currency, budgets, overall_status } = data;
    
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
        
        {/* Overall Performance Summary (for budget_performance type) */}
        {total_budgeted !== undefined && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
              <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm mr-2">€</span>
              Overall Budget Performance
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {currency || 'EUR'} {total_budgeted}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Budget</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {currency || 'EUR'} {total_spent}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {currency || 'EUR'} {remaining_budget}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Remaining</div>
              </div>
            </div>
            
            {overall_status && (
              <div className="mt-3 text-center">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                  overall_status === 'on_track' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : overall_status === 'warning'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {overall_status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
            <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm mr-2">€</span>
            Budget Details
          </h4>
          
          <div className="space-y-3">
            {budgets && budgets.map((budget: any, index: number) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {budget.name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      ({budget.category})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      budget.status === 'On track' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : budget.status === 'Warning'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {budget.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Spent:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {currency} {budget.spent} / {currency} {budget.budget_amount}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {currency} {budget.remaining}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        budget.percentage_used >= 90 ? 'bg-red-500' :
                        budget.percentage_used >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budget.percentage_used, 100)}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-right">
                    {budget.percentage_used}% used
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {total_spent && (
            <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="flex justify-between items-center font-semibold text-blue-900 dark:text-blue-100">
                <span>Total Spent This Month:</span>
                <span>{currency} {total_spent}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSpendingAnalysis = (content: any) => {
    const { message, data } = content;
    const { total_spent, currency, period, breakdown } = data;
    
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3 flex items-center">
            <span className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm mr-2">📊</span>
            Spending Analysis: {currency} {total_spent} ({period})
          </h4>
          
          <div className="space-y-2">
            {breakdown.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-green-100 dark:border-green-800">
                <div className="flex items-center flex-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {item.category}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {currency} {item.amount}
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="ml-3 w-20">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-700">
            <div className="flex justify-between items-center font-semibold text-green-900 dark:text-green-100">
              <span>Total Spent ({period}):</span>
              <span>{currency} {total_spent}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReceiptDetails = (content: any) => {
    const { message, data } = content;
    const { merchant, date, total_amount, currency, items } = data;
    
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center">
            <span className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm mr-2">🧾</span>
            Receipt from {merchant} - {new Date(date).toLocaleDateString()}
          </h4>
          
          <div className="space-y-2 mb-4">
            {items && items.map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-purple-100 dark:border-purple-800">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                    {item.quantity && (
                      <span>Qty: {item.quantity}</span>
                    )}
                    {item.category && (
                      <>
                        <span>•</span>
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          {item.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {currency} {typeof item.amount === 'number' ? item.amount.toFixed(2) : item.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-3 border-t border-purple-200 dark:border-purple-700">
            <div className="flex justify-between items-center font-semibold text-purple-900 dark:text-purple-100">
              <span>Total:</span>
              <span className="text-lg">
                {currency} {typeof total_amount === 'number' ? total_amount.toFixed(2) : total_amount}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactionList = (content: any) => {
    const { message, data } = content;
    const { transactions } = data;
    
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
        
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center">
            <span className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm mr-2">💳</span>
            Recent Transactions
          </h4>
          
          <div className="space-y-2">
            {transactions && transactions.map((transaction: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-orange-100 dark:border-orange-800">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {transaction.description}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                    <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      {transaction.category}
                    </span>
                    {transaction.merchant && transaction.merchant !== transaction.description && (
                      <>
                        <span>•</span>
                        <span className="text-gray-500 dark:text-gray-400">{transaction.merchant}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    -{typeof transaction.amount === 'number' ? transaction.amount.toFixed(2) : transaction.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {transactions && transactions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-orange-200 dark:border-orange-700">
              <div className="flex justify-between items-center text-sm text-orange-800 dark:text-orange-200">
                <span>Total transactions:</span>
                <span className="font-medium">{transactions.length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGenericStructuredResponse = (content: any) => {
    const { message, data } = content;
    
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
        
        {data && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-x-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  const renderTable = (rows: string[], keyPrefix: number) => {
    const processedRows = rows.map(row => 
      row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
    );
    
    if (processedRows.length === 0) return null;
    
    const headers = processedRows[0];
    const dataRows = processedRows.slice(1).filter(row => 
      !row.every(cell => cell.match(/^[-:]+$/)) // Skip separator rows
    );
    
    return (
      <div key={`table-${keyPrefix}`} className="overflow-x-auto my-4">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  {formatInlineText(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {dataRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-3 text-sm text-gray-900 dark:text-gray-300"
                  >
                    {formatInlineText(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatInlineText = (text: string) => {
    // Enhanced inline formatting with code, links, and emphasis
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/);
    
    return parts.map((part, index) => {
      // Handle bold text
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-gray-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      
      // Handle italic text
      if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return (
          <em key={index} className="italic text-blue-600 dark:text-blue-400">
            {part.slice(1, -1)}
          </em>
        );
      }
      
      // Handle inline code
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      
      // Handle links [text](url)
      const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        const [, linkText, linkUrl] = linkMatch;
        return (
          <a
            key={index}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
          >
            {linkText}
          </a>
        );
      }
      
      return part;
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Financial Assistant</h1>
        <p className="text-gray-600 dark:text-gray-400">Ask questions about your spending, budgets, and financial insights</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            // Welcome State
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.456L3 21l2.456-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Start a conversation</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">Ask me about your spending patterns, budget status, or any financial questions!</p>
              
              {/* Suggestion Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {getInitialRecommendations().map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecommendationClick(suggestion)}
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
            </div>
          ) : (
            // Chat Messages
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
                      <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {formatMessage(message.ai_response)}
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
                          {formatMessage(streamingResponse)}
                          <span className="inline-block w-2 h-4 bg-blue-500 dark:bg-blue-400 ml-1 animate-pulse rounded"></span>
                        </>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className={`flex items-center space-x-2 ${getStreamingIndicator().color}`}>
                            <span>{getStreamingIndicator().icon}</span>
                            <span>{getStreamingIndicator().text}</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contextual Recommendations */}
              {recommendations.length > 0 && !isStreaming && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Try these suggestions:</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {recommendations.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecommendationClick(suggestion)}
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
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
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
          
          {messages.length > 0 && (
            <div className="flex justify-between items-center mt-3">
              <button
                onClick={handleClearHistory}
                disabled={isLoading || isStreaming}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear History
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isStreaming ? 'AI is typing...' : `${messages.length} message${messages.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clear History Modal */}
      {showClearModal && (
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
                  onClick={cancelClear}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClearHistory}
                  className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
                >
                  Clear History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}