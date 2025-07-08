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
  const [recommendations, setRecommendations] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cleanupStreamRef = useRef<(() => void) | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        setStreamingResponse(prev => prev + chunk)
      },
      // onComplete
      (fullResponse: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        
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
        setStreamingResponse(prev => prev + chunk)
      },
      // onComplete
      (fullResponse: string) => {
        setIsStreaming(false)
        setStreamingResponse('')
        
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
    // Check if the response contains JSON structured data
    try {
      // First, try to find JSON-like structure in the text
      const jsonStart = text.indexOf('{');
      if (jsonStart !== -1) {
        // Extract potential JSON from the first opening brace to the end
        const potentialJson = text.substring(jsonStart);
        
        // Try to find the complete JSON object
        let braceCount = 0;
        let endIndex = -1;
        
        for (let i = 0; i < potentialJson.length; i++) {
          if (potentialJson[i] === '{') {
            braceCount++;
          } else if (potentialJson[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIndex = i;
              break;
            }
          }
        }
        
        if (endIndex !== -1) {
          const jsonString = potentialJson.substring(0, endIndex + 1);
          const jsonResponse = JSON.parse(jsonString);
          if (jsonResponse.type && jsonResponse.content) {
            return renderStructuredResponse(jsonResponse);
          }
        }
      }
      
      // Also try to parse the entire text as JSON (fallback)
      const jsonResponse = JSON.parse(text.trim());
      if (jsonResponse.type && jsonResponse.content) {
        return renderStructuredResponse(jsonResponse);
      }
    } catch (e) {
      // Not JSON, continue with markdown formatting
    }

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
        const headerClass = {
          1: 'text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-4 first:mt-0',
          2: 'text-xl font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0',
          3: 'text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0',
          4: 'text-base font-semibold text-gray-900 dark:text-white mb-2 mt-2 first:mt-0',
          5: 'text-sm font-semibold text-gray-900 dark:text-white mb-1 mt-2 first:mt-0',
          6: 'text-xs font-semibold text-gray-900 dark:text-white mb-1 mt-2 first:mt-0'
        }[headerLevel] || headerClass[4];
        
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
        return renderBudgetBreakdown(content);
      case 'spending_analysis':
        return renderSpendingAnalysis(content);
      case 'structured_response':
        return renderGenericStructuredResponse(content);
      default:
        // Fallback to regular markdown if unknown type
        return formatInlineText(JSON.stringify(jsonResponse, null, 2));
    }
  };

  const renderBudgetBreakdown = (content: any) => {
    const { message, data } = content;
    const { total_spent, currency, budgets } = data;
    
    return (
      <div className="space-y-4">
        {message && (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        )}
        
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
            <span className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm mr-2">€</span>
            Budget Performance Overview
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
              {isStreaming && streamingResponse && (
                <div className="flex justify-start">
                  <div className="max-w-3xl bg-white dark:bg-gray-800 rounded-lg px-6 py-4 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {formatMessage(streamingResponse)}
                      <span className="inline-block w-2 h-4 bg-blue-500 dark:bg-blue-400 ml-1 animate-pulse rounded"></span>
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