import axios from 'axios';
import { createError } from '../middleware/errorHandler';
// Removed ToolService import to break circular dependency

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
      tool_calls?: any[];
    };
  }>;
}

interface ParsedReceiptData {
  merchantName?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  category?: string;
  items: Array<{
    name: string;
    amount: number;
    quantity?: number;
  }>;
  confidence: number;
}

interface FinancialContext {
  totalSpending: number;
  recentTransactions: Array<any>;
  budgets: Array<any>;
  categories: Array<any>;
}

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';
  private model = 'deepseek-chat';
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('DeepSeek API key not found. Receipt parsing will be disabled.');
    }
  }

  async parseReceiptData(extractedText: string): Promise<ParsedReceiptData> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }
    
    try {
      console.log('DeepSeek: Starting receipt parsing for text:', extractedText.substring(0, 200));
      
      const response = await this.makeReceiptParsingRequest(extractedText);
      
      try {
        console.log('DeepSeek: Raw JSON response:', response);
        const parsedData = JSON.parse(response);
        console.log('DeepSeek: Successfully parsed JSON:', parsedData);
        
        return this.validateParsedData(parsedData);
      } catch (parseError) {
        console.error('DeepSeek: JSON parse failed:', parseError);
        console.error('DeepSeek: Raw response that failed to parse:', response);
        throw createError('Failed to parse receipt data from DeepSeek API response', 422);
      }
    } catch (error) {
      console.error('DeepSeek: Receipt parsing error:', error);
      throw error;
    }
  }

  async processFinancialQuery(message: string, context: FinancialContext, userId?: string, toolService?: any): Promise<string> {
    try {
      if (!toolService) {
        throw new Error('ToolService instance is required for processFinancialQuery');
      }
      const rawTools = toolService.getAvailableTools();
      const availableTools = rawTools.map((tool: any) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      
      const prompt = `
You are a financial advisor AI assistant with the ability to read and modify user's financial data.

User's Financial Context:
- Total spending this month: $${context.totalSpending}
- Number of recent transactions: ${context.recentTransactions.length}
- Active budgets: ${context.budgets.length}
- Categories: ${context.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}

Recent Transactions:
${context.recentTransactions.slice(0, 5).map(t => 
  `- $${t.amount} at ${t.merchant_name || t.description} (${t.category_name || 'Unknown'}) on ${new Date(t.transaction_date).toLocaleDateString()}`
).join('\n')}

Active Budgets:
${context.budgets.map(b => 
  `- ${b.name}: ${b.currency} ${b.amount} budget (${b.category_name})`
).join('\n')}

User Question: ${message}

You can help the user by:
1. Answering questions about their spending patterns and financial data
2. Adding, editing, or deleting transactions when requested
3. Creating, modifying, or deleting budgets
4. Creating new spending categories
5. Providing financial analysis and insights
6. Showing detailed receipt items from scanned receipts

When the user asks you to make changes (add transactions, create budgets, etc.), use the appropriate function calls to execute these actions.

IMPORTANT: When users ask about specific items they bought, individual receipt details, or what was on their receipt:
1. First use get_transactions to find the relevant transaction
2. Then use get_receipt_items with the transaction_id to show the detailed itemized breakdown
3. Return the data in JSON format for frontend processing

IMPORTANT: When creating budgets:
1. Always use the currency specified by the user (e.g., EUR, USD)
2. For monthly budgets, set start_date to the 1st of the month and end_date to the last day of the month
3. For August budgets in 2025, use start_date: '2025-08-01' and end_date: '2025-08-31'

When using tools, make sure to pass the user's message in the arguments so the tool can extract relevant information.

IMPORTANT: When updating budgets, you must provide at least one meaningful update field (name, amount, currency, or alert_threshold). Do not call update_budget with only identification fields like budget_name or category_name.

Provide helpful, actionable advice in a conversational tone. If you need to use tools to fulfill the request, explain what you're doing and why.`;

      let response = await this.makeAPIRequestWithTools(prompt, message, availableTools, []);
      
      if (userId && response.toolCalls) {
        const toolResults = [];
        for (const toolCall of response.toolCalls) {
          const args = JSON.parse(toolCall.function.arguments);
          args.message = message; 
          const result = await toolService.executeTool(
            toolCall.function.name, 
            args, 
            userId
          );
          toolResults.push({ name: toolCall.function.name, result });
        }
        
        response = await this.makeAPIRequestWithToolResults(prompt, response.content, toolResults);
      }
      
      return response.content || response;
    } catch (error) {
      console.error('DeepSeek: Financial query failed:', error);
      throw error;
    }
  }

  async processFinancialQueryStream(
    message: string, 
    context: FinancialContext, 
    onChunk: (chunk: string) => void,
    userId?: string,
    history: any[] = [],
    toolService?: any
  ): Promise<void> {
    try {
      if (!toolService) {
        throw new Error('ToolService instance is required for processFinancialQueryStream');
      }
      const rawTools = toolService.getAvailableTools();
      const availableTools = rawTools.map((tool: any) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      
      const systemPrompt = `You are a financial advisor AI assistant with the ability to read and modify user's financial data.

User's Financial Context:
- Total spending this month: $${context.totalSpending}
- Number of recent transactions: ${context.recentTransactions.length}
- Active budgets: ${context.budgets.length}
- Categories: ${context.categories.map(c => `${c.name} (ID: ${c.id})`).join(', ')}

Recent Transactions:
${context.recentTransactions.slice(0, 5).map(t => 
  `- $${t.amount} at ${t.merchant_name || t.description} (${t.category_name || 'Unknown'}) on ${new Date(t.transaction_date).toLocaleDateString()}`
).join('\n')}

Active Budgets:
${context.budgets.map(b => 
  `- ${b.name}: $${b.amount} budget (${b.category_name})`
).join('\n')}

You can help the user by:
1. Answering questions about their spending patterns and financial data
2. Adding, editing, or deleting transactions when requested
3. Creating, modifying, or deleting budgets
4. Creating new spending categories
5. Providing financial analysis and insights
6. Showing detailed receipt items from scanned receipts

When the user asks you to make changes (add transactions, create budgets, etc.), you MUST use the appropriate function calls to execute these actions. Do not just describe what you would do.

IMPORTANT: When users ask about specific items they bought, individual receipt details, or what was on their receipt:
1. First use get_transactions to find the relevant transaction
2. Then use get_receipt_items with the transaction_id to show the detailed itemized breakdown
3. Return the data in JSON format for frontend processing

IMPORTANT: When updating budgets, you must provide at least one meaningful update field (name, amount, currency, or alert_threshold). Do not call update_budget with only identification fields like budget_name or category_name.

IMPORTANT: For structured data like budget breakdowns, spending analysis, comparisons, receipt items, and transaction lists, format your response as JSON with the following structure:
{
  "type": "structured_response",
  "content": {
    "message": "Your explanatory text here",
    "data": {
      // Your structured data here (tables, charts, lists)
    }
  }
}

For budget breakdowns, use this format:
{
  "type": "budget_breakdown",
  "content": {
    "message": "Brief explanation",
    "data": {
      "total_budget": 50,
      "currency": "EUR",
      "categories": [
        {"name": "Groceries", "amount": 15, "notes": "Essential food items"},
        {"name": "Utilities", "amount": 10, "notes": "Bills (electricity, water, etc.)"}
      ]
    }
  }
}

For spending analysis, use:
{
  "type": "spending_analysis",
  "content": {
    "message": "Analysis summary",
    "data": {
      "total_spent": 100,
      "currency": "EUR",
      "period": "this month",
      "breakdown": [
        {"category": "Groceries", "amount": 60, "percentage": 60},
        {"category": "Dining Out", "amount": 40, "percentage": 40}
      ]
    }
  }
}

For receipt items, use:
{
  "type": "receipt_details",
  "content": {
    "message": "Receipt items from [merchant] on [date]",
    "data": {
      "merchant": "REWE",
      "date": "2025-07-05",
      "total_amount": 29.36,
      "currency": "EUR",
      "items": [
        {"name": "KAESE SALAMI EUR STICK", "amount": 1.89, "quantity": 1, "category": "groceries"},
        {"name": "BERGKAESE SCH", "amount": 2.99, "quantity": 1, "category": "groceries"}
      ]
    }
  }
}

For transaction lists, use:
{
  "type": "transaction_list",
  "content": {
    "message": "Your recent transactions",
    "data": {
      "transactions": [
        {"amount": 3, "description": "carrot cake", "category": "food", "date": "2025-07-08", "merchant": "carrot cake"},
        {"amount": 2.55, "description": "dm-drogerie markt", "category": "retail", "date": "2025-07-07", "merchant": "dm-drogerie markt"}
      ]
    }
  }
}

Provide helpful, actionable advice in a conversational tone. If you need to use tools to fulfill the request, explain what you're doing and why.`;

      await this.makeAPIRequestWithToolsStream(systemPrompt, message, availableTools, onChunk, userId, history, toolService);

    } catch (error) {
      console.error('DeepSeek: Streaming financial query failed:', error);
      onChunk(JSON.stringify({ type: 'error', message: 'Failed to process your request.' }));
      throw error;
    }
  }

  async suggestCategory(transactionDescription: string, amount: number): Promise<string> {
    try {
      const prompt = `
Based on the transaction description and amount, suggest the most appropriate category.
Choose from: groceries, dining, transportation, entertainment, shopping, healthcare, utilities, travel, education, other

Transaction: "${transactionDescription}"
Amount: $${amount}

Return only the category name, no explanation:`;

      const response = await this.makeAPIRequest(prompt);
      return response.trim().toLowerCase();
    } catch (error) {
      return 'other';
    }
  }

  async suggestCategoryForItem(itemName: string, amount?: number): Promise<string> {
    try {
      const prompt = `
Based on the item name${amount !== undefined ? ' and amount' : ''}, suggest the most appropriate category.
Choose from: groceries, dining, transportation, entertainment, shopping, healthcare, utilities, travel, education, other

Item: "${itemName}"${amount !== undefined ? `\nAmount: $${amount}` : ''}

Return only the category name, no explanation:`;
      const response = await this.makeAPIRequest(prompt);
      return response.trim().toLowerCase();
    } catch (error) {
      return 'other';
    }
  }

  private async makeReceiptParsingRequest(extractedText: string): Promise<string> {
    try {
      console.log('DeepSeek: Making receipt parsing API request to:', `${this.baseUrl}/chat/completions`);
      console.log('DeepSeek: API key configured:', this.apiKey ? 'Yes' : 'No');
      
      const optimizedPrompt = `Extract receipt data as JSON:
{
  "merchantName": "store name",
  "totalAmount": number,
  "currency": "EUR/USD",
  "date": "YYYY-MM-DD",
  "category": "category",
  "items": [{"name": "item", "amount": number}],
  "confidence": 0-1
}

Receipt: ${extractedText}`;

      const response = await axios.post<DeepSeekResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: optimizedPrompt
            }
          ],
          max_tokens: 500,
          temperature: 0,
          stream: false,
          n: 1,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json',
          },
          timeout: 90000,
        }
      );

      console.log('DeepSeek: API response status:', response.status);
      console.log('DeepSeek: API response data:', JSON.stringify(response.data, null, 2));
      
      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('DeepSeek: API request failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('DeepSeek: Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          code: error.code
        });
        
        if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
          throw createError('DeepSeek API connection error', 503);
        }

        if (error.response?.status === 429) {
          throw createError('DeepSeek API rate limit exceeded', 429);
        }
        
        throw createError(`DeepSeek API error: ${error.response?.data?.error?.message || error.message}`, error.response?.status || 500);
      }
      throw error;
    }
  }

  private async makeAPIRequest(prompt: string): Promise<string> {
    try {
      console.log('DeepSeek: Making API request to:', `${this.baseUrl}/chat/completions`);
      
      const response = await axios.post<DeepSeekResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 100,
          temperature: 0,
          stream: false,
          n: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('DeepSeek: API request failed:', error);
      throw error;
    }
  }

  private async makeAPIRequestStream(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
    try {
      console.log('DeepSeek: Making streaming API request to:', `${this.baseUrl}/chat/completions`);
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.1,
          stream: true,
          n: 1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream'
        }
      );

      if (!response.data) {
        throw new Error('No response data stream available');
      }

      const stream = response.data as NodeJS.ReadableStream;

      stream.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      });

      return new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });
    } catch (error) {
      console.error('DeepSeek: Streaming API request failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('DeepSeek: Streaming axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          code: error.code
        });

        if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
          throw createError('DeepSeek API connection error during streaming', 503);
        }

        throw createError(`DeepSeek streaming API error: ${error.response?.data?.error?.message || error.message}`, error.response?.status || 500);
      }
      throw error;
    }
  }

  private async makeAPIRequestWithTools(
    systemPrompt: string, 
    userMessage: string, 
    tools: any[], 
    history: any[] = []
  ): Promise<any> {
    try {
      console.log('DeepSeek: Making API request with tools and history');

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.flatMap(h => [
          { role: 'user', content: h.user_message },
          { role: 'assistant', content: h.ai_response }
        ]),
        { role: 'user', content: userMessage }
      ];
      
      const response = await axios.post<any>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          tools,
          tool_choice: 'auto'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const choice = response.data.choices[0];
      const message = choice.message;
      
      return {
        content: message?.content || '',
        tool_calls: message?.tool_calls || null
      };
    } catch (error) {
      console.error('DeepSeek: API request with tools failed:', error);
      if (axios.isAxiosError(error)) {
        console.error('DeepSeek: Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
        return { content: await this.makeAPIRequest(userMessage) };
      }
      throw createError('Failed to communicate with DeepSeek API', 500);
    }
  }

  private async makeAPIRequestWithToolsStream(
    systemPrompt: string,
    userMessage: string,
    tools: any[],
    onChunk: (chunk: string) => void,
    userId?: string,
    history: any[] = [],
    toolService?: any
  ): Promise<void> {
    try {
      const initialResponse = await this.makeAPIRequestWithTools(systemPrompt, userMessage, tools, history);

      if (userId && initialResponse.tool_calls && initialResponse.tool_calls.length > 0 && toolService) {
        console.log('DeepSeek: Executing tools:', initialResponse.tool_calls);
        
        const toolResults = [];
        for (const toolCall of initialResponse.tool_calls) {
          const result = await toolService.executeTool(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            userId
          );
          toolResults.push({ name: toolCall.function.name, result });
        }

        await this.makeAPIRequestWithToolResultsStreamFixed(systemPrompt, userMessage, initialResponse.content, toolResults, onChunk, history);
      
      } else {
        const content = initialResponse.content || "I'm not sure how to help with that. Could you rephrase your question?";
        const chunks = content.match(/.{1,50}/g) || [content];
        for (const chunk of chunks) {
          onChunk(chunk);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    } catch (error) {
      console.error('DeepSeek: Streaming request with tools failed:', error);
      throw error;
    }
  }

  private async makeAPIRequestWithToolResultsStreamFixed(
    systemPrompt: string,
    userMessage: string,
    assistantResponse: string,
    toolResults: any[],
    onChunk: (chunk: string) => void,
    history: any[] = []
  ): Promise<void> {
    try {
      console.log('DeepSeek: Making streaming API request with tool results');
      console.log('DeepSeek: Tool results being sent:', JSON.stringify(toolResults, null, 2));
      console.log('DeepSeek: Starting streaming response...');

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.flatMap(h => [
          { role: 'user', content: h.user_message },
          { role: 'assistant', content: h.ai_response }
        ]),
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantResponse },
        { 
          role: 'user', 
          content: `Tool execution results:\n${toolResults.map(tr => 
            `${tr.name}: ${tr.result.success ? 'Success' : 'Failed'} - ${tr.result.message}${tr.result.data ? '\nData: ' + JSON.stringify(tr.result.data, null, 2) : ''}`
          ).join('\n')}\n\nPlease provide a final response based on these results.`
        }
      ];

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream'
        }
      );

      const stream = response.data as NodeJS.ReadableStream;

      stream.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore incomplete JSON
            }
          }
        }
      });

      return new Promise<void>((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('DeepSeek: Streaming request with tool results failed:', error);
      throw error;
    }
  }

  private async makeAPIRequestWithToolResultsStream(
    systemPrompt: string,
    userMessage: string,
    toolCalls: any[], 
    toolResults: any[],
    onChunk: (chunk: string) => void,
    history: any[] = []
  ): Promise<void> {
    try {
      console.log('DeepSeek: Making streaming API request with tool results');
      console.log('DeepSeek: Tool results being sent:', JSON.stringify(toolResults, null, 2));

      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.flatMap(h => [
          { role: 'user', content: h.user_message },
          { role: 'assistant', content: h.ai_response }
        ]),
        { role: 'user', content: userMessage },
        { role: 'assistant', content: null, tool_calls: toolCalls },
        ...toolResults.map(tr => ({
          role: 'tool',
          tool_call_id: tr.tool_call_id,
          content: tr.output
        }))
      ];

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream'
        }
      );

      const stream = response.data as NodeJS.ReadableStream;

      stream.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore incomplete JSON
            }
          }
        }
      });

      return new Promise<void>((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

    } catch (error) {
      console.error('DeepSeek: Streaming API request with tool results failed:', error);
      throw error;
    }
  }

  private async makeAPIRequestWithToolResults(
    originalPrompt: string, 
    assistantResponse: string, 
    toolResults: any[]
  ): Promise<any> {
    try {
      const messages = [
        { role: 'user', content: originalPrompt },
        { role: 'assistant', content: assistantResponse },
        { 
          role: 'user', 
          content: `Tool execution results:\n${toolResults.map(tr => 
            `${tr.name}: ${tr.result.success ? 'Success' : 'Failed'} - ${tr.result.message}`
          ).join('\n')}\n\nPlease provide a final response based on these results.`
        }
      ];

      const response = await axios.post<any>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: 1000,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey!}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        content: response.data.choices[0]?.message?.content || assistantResponse
      };
    } catch (error) {
      console.error('DeepSeek: API request with tool results failed:', error);
      return { content: assistantResponse };
    }
  }

  private validateParsedData(data: any): ParsedReceiptData {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid parsed data format');
    }
    
    return {
      merchantName: data.merchantName || 'Unknown Merchant',
      totalAmount: parseFloat(data.totalAmount) || 0,
      currency: data.currency || 'USD',
      date: data.date,
      category: data.category || 'other',
      items: Array.isArray(data.items) ? data.items : [],
      confidence: Math.min(Math.max(parseFloat(data.confidence) || 0.5, 0), 1)
    };
  }
}
