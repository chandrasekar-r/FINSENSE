import React from 'react'
import { TransactionListRenderer } from './responses/TransactionListRenderer'
import { BudgetBreakdownRenderer } from './responses/BudgetBreakdownRenderer'
import { ReceiptDetailsRenderer } from './responses/ReceiptDetailsRenderer'
import { SpendingAnalysisRenderer } from './responses/SpendingAnalysisRenderer'

interface MessageFormatterProps {
  text: string
  isStreaming?: boolean
}

export const MessageFormatter: React.FC<MessageFormatterProps> = ({ text, isStreaming = false }) => {
  
  // During streaming, don't try to parse JSON - just show the text as-is
  if (isStreaming) {
    return <>{formatInlineText(text)}</>
  }
  
  // Try to parse as structured JSON response (backend-processed)
  try {
    const trimmedText = text.trim()
    if (trimmedText.startsWith('{')) {
      
      // Try to find the end of the JSON object
      let braceCount = 0
      let jsonEndIndex = -1
      for (let i = 0; i < trimmedText.length; i++) {
        if (trimmedText[i] === '{') braceCount++
        if (trimmedText[i] === '}') braceCount--
        if (braceCount === 0) {
          jsonEndIndex = i
          break
        }
      }
      
      if (jsonEndIndex > 0) {
        const jsonText = trimmedText.substring(0, jsonEndIndex + 1)
        const jsonResponse = JSON.parse(jsonText)
        if (jsonResponse.type && jsonResponse.content) {
          return renderStructuredResponse(jsonResponse)
        }
      }
    }
  } catch (e) {
    // Not JSON, continue with markdown formatting
  }

  // Enhanced formatting for AI responses with comprehensive markdown support
  // First, check if this looks like a budget-style markdown response
  if ((text.includes('Budget') || text.includes('Spending')) && 
      (text.includes('spent') || text.includes('remaining') || text.includes('$')) && 
      text.includes('###')) {
    return renderBudgetMarkdown(text)
  }
  
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockLines: string[] = []
  let inTable = false
  let tableRows: string[] = []
  
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
        )
        codeBlockLines = []
        inCodeBlock = false
      } else {
        // Start code block
        inCodeBlock = true
      }
      return
    }
    
    if (inCodeBlock) {
      codeBlockLines.push(line)
      return
    }
    
    // Handle tables
    if (line.includes('|') && line.split('|').length > 2) {
      if (!inTable) {
        inTable = true
        tableRows = []
      }
      tableRows.push(line)
      return
    } else if (inTable) {
      // End table
      elements.push(renderTable(tableRows, index))
      tableRows = []
      inTable = false
    }
    
    // Skip empty lines
    if (!line.trim()) {
      elements.push(<div key={index} className="h-2" />)
      return
    }
    
    // Handle headers (# ## ###)
    if (line.startsWith('#')) {
      const headerLevel = line.match(/^#+/)?.[0].length || 1
      const headerText = line.replace(/^#+\s*/, '')
      const headerClasses: Record<number, string> = {
        1: 'text-2xl font-bold text-gray-900 dark:text-white mb-3 mt-4 first:mt-0',
        2: 'text-xl font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0',
        3: 'text-lg font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0',
        4: 'text-base font-semibold text-gray-900 dark:text-white mb-2 mt-2 first:mt-0',
        5: 'text-sm font-semibold text-gray-900 dark:text-white mb-1 mt-2 first:mt-0',
        6: 'text-xs font-semibold text-gray-900 dark:text-white mb-1 mt-2 first:mt-0'
      }
      const headerClass = headerClasses[headerLevel] || headerClasses[4]
      
      elements.push(
        React.createElement(`h${Math.min(headerLevel, 6)}`, {
          key: index,
          className: headerClass
        }, formatInlineText(headerText))
      )
      return
    }
    
    // Handle headers (lines starting with ** and ending with **)
    if (line.startsWith('**') && line.endsWith('**')) {
      const headerText = line.slice(2, -2)
      elements.push(
        <h4 key={index} className="font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">
          {headerText}
        </h4>
      )
      return
    }
    
    // Handle numbered lists
    if (line.trim().match(/^\d+\.\s/)) {
      const numberText = line.replace(/^\s*\d+\.\s*/, '')
      elements.push(
        <div key={index} className="flex items-start mb-1">
          <span className="text-blue-500 dark:text-blue-400 mr-2 mt-1 font-medium">
            {line.match(/^\s*(\d+)\./)?.[1]}.
          </span>
          <span className="flex-1">{formatInlineText(numberText)}</span>
        </div>
      )
      return
    }
    
    // Handle bullet points
    if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*')) {
      const bulletText = line.replace(/^\s*[-•*]\s*/, '')
      elements.push(
        <div key={index} className="flex items-start mb-1">
          <span className="text-blue-500 dark:text-blue-400 mr-2 mt-1">•</span>
          <span className="flex-1">{formatInlineText(bulletText)}</span>
        </div>
      )
      return
    }
    
    // Handle blockquotes
    if (line.trim().startsWith('>')) {
      const quoteText = line.replace(/^\s*>\s*/, '')
      elements.push(
        <div key={index} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2 my-2 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg">
          <p className="text-gray-700 dark:text-gray-300 italic">
            {formatInlineText(quoteText)}
          </p>
        </div>
      )
      return
    }
    
    // Handle regular paragraphs
    elements.push(
      <p key={index} className="mb-2 last:mb-0 text-gray-700 dark:text-gray-300 leading-relaxed">
        {formatInlineText(line)}
      </p>
    )
  })
  
  // Handle any remaining table
  if (inTable && tableRows.length > 0) {
    elements.push(renderTable(tableRows, lines.length))
  }
  
  return <>{elements}</>
}

const renderBudgetMarkdown = (text: string) => {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    
    // Skip empty lines
    if (!trimmedLine) {
      return
    }
    
    // Handle section headers (###)
    if (trimmedLine.startsWith('###')) {
      const headerText = trimmedLine.replace(/^###\s*/, '')
      
      // Style budget sections with cards
      const isBudgetSection = headerText.includes('Grocery') || headerText.includes('Dining') || headerText.includes('Spending')
      
      if (isBudgetSection) {
        elements.push(
          <div key={`section-${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white text-lg mb-3">{headerText}</h4>
          </div>
        )
      } else {
        elements.push(
          <h4 key={`header-${index}`} className="text-lg font-semibold text-gray-900 dark:text-white mb-3 mt-4">
            {headerText}
          </h4>
        )
      }
      return
    }
    
    // Handle ## headers
    if (trimmedLine.startsWith('##')) {
      const headerText = trimmedLine.replace(/^##\s*/, '')
      elements.push(
        <h3 key={`header-${index}`} className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-4">
          {headerText}
        </h3>
      )
      return
    }
    
    // Handle # headers
    if (trimmedLine.startsWith('#')) {
      const headerText = trimmedLine.replace(/^#\s*/, '')
      elements.push(
        <h2 key={`header-${index}`} className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6">
          {headerText}
        </h2>
      )
      return
    }
    
    // Handle bullet points with insights
    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*')) {
      const bulletText = trimmedLine.replace(/^[-•*]\s*/, '').trim()
      
      // Color-code insights
      let insightColor = 'text-gray-700 dark:text-gray-300'
      if (bulletText.includes('Cost Efficiency') || bulletText.includes('great')) {
        insightColor = 'text-green-600 dark:text-green-400'
      } else if (bulletText.includes('Opportunity') || bulletText.includes('Recommend')) {
        insightColor = 'text-blue-600 dark:text-blue-400'
      }
      
      elements.push(
        <div key={`bullet-${index}`} className="flex items-start mb-2 ml-4">
          <span className="text-blue-500 dark:text-blue-400 mr-2 mt-1">▸</span>
          <span className={`text-sm ${insightColor}`}>{formatInlineText(bulletText)}</span>
        </div>
      )
      return
    }
    
    // Handle lines with dollar amounts
    if (trimmedLine.includes('$')) {
      const styledLine = trimmedLine.replace(/\$(\d+(?:\.\d{2})?)/g, '<strong class="text-orange-600 dark:text-orange-400 font-semibold">$$$1</strong>')
      elements.push(
        <div key={`amount-${index}`} className="text-gray-700 dark:text-gray-300 mb-1 ml-2">
          <span dangerouslySetInnerHTML={{ __html: styledLine }} />
        </div>
      )
      return
    }
    
    // Handle regular text
    if (trimmedLine) {
      elements.push(
        <p key={`para-${index}`} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-2">
          {formatInlineText(trimmedLine)}
        </p>
      )
    }
  })
  
  return <div className="space-y-6">{elements}</div>
}

const renderStructuredResponse = (jsonResponse: any) => {
  const { type, content } = jsonResponse
  
  switch (type) {
    case 'transaction_list':
      return <TransactionListRenderer content={content} />
    case 'budget_breakdown':
      return <BudgetBreakdownRenderer content={content} />
    case 'receipt_details':
      return <ReceiptDetailsRenderer content={content} />
    case 'spending_analysis':
      return <SpendingAnalysisRenderer content={content} />
    default:
      // Fallback to regular markdown if unknown type
      return formatInlineText(JSON.stringify(jsonResponse, null, 2))
  }
}

const renderTable = (rows: string[], keyPrefix: number) => {
  const processedRows = rows.map(row => 
    row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
  )
  
  if (processedRows.length === 0) return null
  
  const headers = processedRows[0]
  const dataRows = processedRows.slice(1).filter(row => 
    !row.every(cell => cell.match(/^[-:]+$/)) // Skip separator rows
  )
  
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
  )
}

const formatInlineText = (text: string) => {
  // Enhanced inline formatting with code, links, and emphasis
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/)
  
  return parts.map((part, index) => {
    // Handle bold text
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-gray-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    
    // Handle italic text
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={index} className="italic text-blue-600 dark:text-blue-400">
          {part.slice(1, -1)}
        </em>
      )
    }
    
    // Handle inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1 py-0.5 rounded text-sm font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    
    // Handle links [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/)
    if (linkMatch) {
      const [, linkText, linkUrl] = linkMatch
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
      )
    }
    
    return part
  })
}