import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { TransactionService } from './TransactionService';
import { BudgetService } from './BudgetService';
import { CategoryService } from './CategoryService';
import { ReceiptProcessingService } from './ReceiptProcessingService';

interface ToolResult {
  success: boolean;
  data?: any;
  message: string;
}

interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export class ToolService {
  private transactionService: TransactionService;
  private budgetService: BudgetService;
  private categoryService: CategoryService;
  private receiptProcessingService: ReceiptProcessingService;

  constructor() {
    this.transactionService = new TransactionService();
    this.budgetService = new BudgetService();
    this.categoryService = new CategoryService();
    this.receiptProcessingService = new ReceiptProcessingService();
  }

  getAvailableTools(): Tool[] {
    return [
      {
        name: 'add_transaction',
        description: 'Add a new transaction (expense or income)',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Transaction amount (always positive)' },
            description: { type: 'string', description: 'Transaction description' },
            category_id: { type: 'string', description: 'Category ID for the transaction' },
            transaction_type: { type: 'string', enum: ['income', 'expense'], description: 'Type of transaction' },
            transaction_date: { type: 'string', description: 'Date in YYYY-MM-DD format (optional, defaults to today)' },
            merchant_name: { type: 'string', description: 'Merchant or vendor name (optional)' }
          },
          required: ['amount', 'description', 'category_id', 'transaction_type']
        }
      },
      {
        name: 'update_transaction',
        description: 'Update an existing transaction',
        parameters: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', description: 'ID of transaction to update' },
            amount: { type: 'number', description: 'New amount (optional)' },
            description: { type: 'string', description: 'New description (optional)' },
            category_id: { type: 'string', description: 'New category ID (optional)' },
            transaction_type: { type: 'string', enum: ['income', 'expense'], description: 'New transaction type (optional)' },
            merchant_name: { type: 'string', description: 'New merchant name (optional)' }
          },
          required: ['transaction_id']
        }
      },
      {
        name: 'delete_transaction',
        description: 'Delete a transaction',
        parameters: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', description: 'ID of transaction to delete' }
          },
          required: ['transaction_id']
        }
      },
      {
        name: 'create_budget',
        description: 'Create a new budget for a category',
        parameters: {
          type: 'object',
          properties: {
            category_id: { type: 'string', description: 'Category ID for the budget' },
            name: { type: 'string', description: 'Budget name' },
            amount: { type: 'number', description: 'Budget amount' },
            currency: { type: 'string', description: 'Currency code (e.g., USD, EUR). Defaults to USD.' },
            period_type: { type: 'string', enum: ['weekly', 'monthly', 'yearly'], description: 'Budget period' },
            start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional)' },
            alert_threshold: { type: 'number', description: 'Alert threshold percentage (optional, default 80)' }
          },
          required: ['category_id', 'name', 'amount', 'period_type']
        }
      },
      {
        name: 'update_budget',
        description: 'Update an existing budget with new values. At least one update field (name, amount, currency, or alert_threshold) must be provided.',
        parameters: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'ID of budget to update (use if known)' },
            budget_name: { type: 'string', description: 'Name of budget to find and update (alternative to budget_id)' },
            category_name: { type: 'string', description: 'Category name to find budget (alternative to budget_id)' },
            name: { type: 'string', description: 'New budget name (optional)' },
            amount: { type: 'number', description: 'New budget amount (optional)' },
            currency: { type: 'string', description: 'New currency code (e.g., USD, EUR) (optional)' },
            alert_threshold: { type: 'number', description: 'New alert threshold percentage (optional)' }
          },
          required: []
        }
      },
      {
        name: 'delete_budget',
        description: 'Delete a budget',
        parameters: {
          type: 'object',
          properties: {
            budget_id: { type: 'string', description: 'ID of budget to delete' }
          },
          required: ['budget_id']
        }
      },
      {
        name: 'create_category',
        description: 'Create a new spending category',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Category name' },
            color: { type: 'string', description: 'Category color (hex code, optional)' },
            icon: { type: 'string', description: 'Category icon name (optional)' }
          },
          required: ['name']
        }
      },
      {
        name: 'get_transactions',
        description: 'Get transactions with optional filters. IMPORTANT: When users ask about receipt details, use this to find transactions first, then IMMEDIATELY use get_receipt_items with the transaction_id to show detailed receipt items.',
        parameters: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by category name (optional)' },
            start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional)' },
            end_date: { type: 'string', description: 'End date in YYYY-MM-DD format (optional)' },
            transaction_type: { type: 'string', enum: ['income', 'expense'], description: 'Filter by transaction type (optional)' },
            limit: { type: 'number', description: 'Number of transactions to return (optional, default 10)' }
          },
          required: []
        }
      },
      {
        name: 'get_spending_analysis',
        description: 'Get detailed spending analysis and insights',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['week', 'month', 'year'], description: 'Analysis period (optional, default month)' }
          },
          required: []
        }
      },
      {
        name: 'get_budgets',
        description: 'Get all user budgets with their current status',
        parameters: {
          type: 'object',
          properties: {
            category_name: { type: 'string', description: 'Filter by category name (optional)' }
          },
          required: []
        }
      },
      {
        name: 'create_budget_with_category',
        description: 'Create a new budget and category if it does not exist',
        parameters: {
          type: 'object',
          properties: {
            category_name: { type: 'string', description: 'Category name (will be created if it does not exist)' },
            budget_name: { type: 'string', description: 'Budget name' },
            amount: { type: 'number', description: 'Budget amount' },
            currency: { type: 'string', description: 'Currency code (e.g., USD, EUR). Defaults to USD.' },
            period_type: { type: 'string', enum: ['weekly', 'monthly', 'yearly'], description: 'Budget period' },
            start_date: { type: 'string', description: 'Start date in YYYY-MM-DD format (optional)' },
            end_date: { type: 'string', description: 'End date in YYYY-MM-DD format (optional)' },
            alert_threshold: { type: 'number', description: 'Alert threshold percentage (optional, default 80)' },
            category_color: { type: 'string', description: 'Category color (hex code, optional)' },
            category_icon: { type: 'string', description: 'Category icon name (optional)' }
          },
          required: ['category_name', 'budget_name', 'amount', 'period_type']
        }
      },
      {
        name: 'get_receipt_items',
        description: 'MANDATORY: Get detailed individual items from a scanned receipt. ALWAYS use this tool when users ask about: specific items they bought, what was on their receipt, individual product details, itemized breakdown of purchases, or "show me the detailed receipt". This shows each item name, price, quantity, and category from receipts. Use the transaction_id from get_transactions results. NOTE: Only transactions created from scanned receipts will have item-level data.',
        parameters: {
          type: 'object',
          properties: {
            receipt_id: { type: 'string', description: 'Receipt ID to get items from' },
            transaction_id: { type: 'string', description: 'Transaction ID to find related receipt (alternative to receipt_id)' }
          },
          required: []
        }
      },
      {
        name: 'update_receipt_items',
        description: 'Update or correct individual items in a processed receipt',
        parameters: {
          type: 'object',
          properties: {
            receipt_id: { type: 'string', description: 'Receipt ID to update items for' },
            transaction_id: { type: 'string', description: 'Transaction ID to find related receipt (alternative to receipt_id)' },
            items: {
              type: 'array',
              description: 'Array of corrected items to update',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Item name' },
                  amount: { type: 'number', description: 'Item price/amount' },
                  quantity: { type: 'number', description: 'Item quantity (optional, defaults to 1)' },
                  category: { type: 'string', description: 'Item category (optional)' }
                },
                required: ['name', 'amount']
              }
            },
            merchant_name: { type: 'string', description: 'Update merchant name (optional)' },
            total_amount: { type: 'number', description: 'Update total amount (optional)' },
            currency: { type: 'string', description: 'Update currency (optional)' },
            date: { type: 'string', description: 'Update date in YYYY-MM-DD format (optional)' }
          },
          required: ['items']
        }
      }
    ];
  }

  async executeTool(toolName: string, parameters: any, userId: string): Promise<ToolResult> {
    try {
      switch (toolName) {
        case 'add_transaction':
          return await this.addTransaction(parameters, userId);
        
        case 'update_transaction':
          return await this.updateTransaction(parameters, userId);
          
        case 'delete_transaction':
          return await this.deleteTransaction(parameters, userId);
          
        case 'create_budget':
          return await this.createBudget(parameters, userId);
          
        case 'update_budget':
          return await this.updateBudget(parameters, userId);
          
        case 'delete_budget':
          return await this.deleteBudget(parameters, userId);
          
        case 'create_category':
          return await this.createCategory(parameters, userId);
          
        case 'get_transactions':
          return await this.getTransactions(parameters, userId);
          
        case 'get_spending_analysis':
          return await this.getSpendingAnalysis(parameters, userId);
          
        case 'get_budgets':
          return await this.getBudgets(parameters, userId);
          
        case 'create_budget_with_category':
          return await this.createBudgetWithCategory(parameters, userId);
          
        case 'get_receipt_items':
          return await this.getReceiptItems(parameters, userId);
          
        case 'update_receipt_items':
          return await this.updateReceiptItems(parameters, userId);
          
        default:
          return {
            success: false,
            message: `Unknown tool: ${toolName}`
          };
      }
    } catch (error) {
      console.error(`Tool execution error (${toolName}):`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }

  private async addTransaction(params: any, userId: string): Promise<ToolResult> {
    const transaction = await this.transactionService.createTransaction(userId, {
      amount: params.amount,
      description: params.description,
      category_id: params.category_id,
      transaction_type: params.transaction_type,
      transaction_date: params.transaction_date || new Date().toISOString().split('T')[0],
      merchant_name: params.merchant_name
    });

    return {
      success: true,
      data: transaction,
      message: `Added ${params.transaction_type} transaction: $${params.amount} for ${params.description}`
    };
  }

  private async updateTransaction(params: any, userId: string): Promise<ToolResult> {
    const transaction = await this.transactionService.updateTransaction(
      params.transaction_id,
      userId,
      {
        amount: params.amount,
        description: params.description,
        category_id: params.category_id,
        transaction_type: params.transaction_type,
        merchant_name: params.merchant_name
      }
    );

    return {
      success: true,
      data: transaction,
      message: `Updated transaction successfully`
    };
  }

  private async deleteTransaction(params: any, userId: string): Promise<ToolResult> {
    await this.transactionService.deleteTransaction(params.transaction_id, userId);

    return {
      success: true,
      message: `Deleted transaction successfully`
    };
  }

  private async createBudget(params: any, userId: string): Promise<ToolResult> {
    const budget = await this.budgetService.createBudget(userId, {
      category_id: params.category_id,
      name: params.name,
      amount: params.amount,
      currency: params.currency || 'USD',
      period_type: params.period_type,
      start_date: params.start_date || new Date().toISOString().split('T')[0],
      alert_threshold: params.alert_threshold || 80
    });

    return {
      success: true,
      data: budget,
      message: `Created ${params.period_type} budget "${params.name}" with $${params.amount} limit`
    };
  }

  private async updateBudget(params: any, userId: string): Promise<ToolResult> {
    let budgetId = params.budget_id;
    
    // If no budget_id provided, try to find budget by name or category
    if (!budgetId) {
      const budgets = await this.budgetService.getBudgets(userId, false);
      
      if (params.budget_name) {
        const budget = budgets.find((b: any) => 
          b.name.toLowerCase().includes(params.budget_name.toLowerCase())
        );
        if (budget) budgetId = budget.id;
      } else if (params.category_name) {
        const budget = budgets.find((b: any) => 
          b.category_name && b.category_name.toLowerCase().includes(params.category_name.toLowerCase())
        );
        if (budget) budgetId = budget.id;
      }
      
      if (!budgetId) {
        return {
          success: false,
          message: `Could not find budget. Available budgets: ${budgets.map((b: any) => `${b.name} (${b.category_name})`).join(', ')}`
        };
      }
    }
    
    // Build update data from valid fields only
    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.amount !== undefined) updateData.amount = params.amount;
    if (params.currency !== undefined) updateData.currency = params.currency;
    if (params.alert_threshold !== undefined) updateData.alert_threshold = params.alert_threshold;
    
    // If no valid update fields provided, return error with suggestion
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: `No valid update fields provided. You can update: name, amount, currency, or alert_threshold. You provided: ${Object.keys(params).join(', ')}`
      };
    }
    
    const budget = await this.budgetService.updateBudget(budgetId, userId, updateData);

    return {
      success: true,
      data: budget,
      message: `Updated budget "${budget.name}" successfully`
    };
  }

  private async deleteBudget(params: any, userId: string): Promise<ToolResult> {
    await this.budgetService.deleteBudget(params.budget_id, userId);

    return {
      success: true,
      message: `Deleted budget successfully`
    };
  }

  private async createCategory(params: any, userId: string): Promise<ToolResult> {
    const category = await this.categoryService.createCategory(userId, {
      name: params.name,
      color: params.color || '#3B82F6',
      icon: params.icon || 'tag'
    });

    return {
      success: true,
      data: category,
      message: `Created category "${params.name}"`
    };
  }

  private async getTransactions(params: any, userId: string): Promise<ToolResult> {
    const filters: any = {};
    const limit = params.limit || 10;
    
    if (params.category) filters.category = params.category;
    if (params.start_date) filters.startDate = params.start_date;
    if (params.end_date) filters.endDate = params.end_date;
    if (params.transaction_type) filters.type = params.transaction_type;

    const transactions = await this.transactionService.getTransactions(userId, 1, limit, filters);

    return {
      success: true,
      data: transactions,
      message: `Found ${transactions.transactions?.length || 0} transactions`
    };
  }

  private async getSpendingAnalysis(params: any, userId: string): Promise<ToolResult> {
    const period = params.period || 'month';
    
    // Get spending summary
    const spendingSummary = await this.transactionService.getSpendingSummary(userId, period);
    
    // Get category breakdown
    const categoryBreakdown = await this.transactionService.getCategorySummary(userId, period);

    // Get budget status
    const budgets = await this.budgetService.getBudgets(userId, true);

    const analysis = {
      period,
      spending: spendingSummary,
      categories: categoryBreakdown,
      budgets: budgets
    };

    return {
      success: true,
      data: analysis,
      message: `Generated spending analysis for the ${period}`
    };
  }

  private async getBudgets(params: any, userId: string): Promise<ToolResult> {
    const budgets = await this.budgetService.getBudgets(userId, true);
    
    let filteredBudgets = budgets;
    if (params.category_name) {
      filteredBudgets = budgets.filter((budget: any) => 
        budget.category_name.toLowerCase().includes(params.category_name.toLowerCase())
      );
    }

    return {
      success: true,
      data: filteredBudgets,
      message: `Found ${filteredBudgets.length} budget(s)`
    };
  }

  private async createBudgetWithCategory(params: any, userId: string): Promise<ToolResult> {
    try {
      // First, get all categories to check if it exists
      const allCategories = await this.categoryService.getUserCategories(userId);
      let category = allCategories.find((c: any) => 
        c.name.toLowerCase() === params.category_name.toLowerCase()
      );

      // If category doesn't exist, create it
      if (!category) {
        category = await this.categoryService.createCategory(userId, {
          name: params.category_name,
          color: params.category_color || '#10B981', // Green for travel
          icon: params.category_icon || 'map'
        });
        console.log('Created new category:', category);
      }

      // Now create the budget with the category ID
      const budget = await this.budgetService.createBudget(userId, {
        category_id: category.id,
        name: params.budget_name,
        amount: params.amount,
        currency: params.currency || 'USD',
        period_type: params.period_type,
        start_date: params.start_date || new Date().toISOString().split('T')[0],
        end_date: params.end_date,
        alert_threshold: params.alert_threshold || 80
      });

      console.log('Created new budget:', budget);

      return {
        success: true,
        data: { category, budget },
        message: `Created category "${params.category_name}" and budget "${params.budget_name}" with ${params.currency || 'USD'} ${params.amount} limit`
      };
    } catch (error) {
      console.error('Error creating budget with category:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create budget with category'
      };
    }
  }

  private async getReceiptItems(params: any, userId: string): Promise<ToolResult> {
    try {
      let receiptId = params.receipt_id;
      
      // If transaction_id provided, find the related receipt
      if (!receiptId && params.transaction_id) {
        const client = await pool.connect();
        try {
          await client.query(`SET app.current_user_id = '${userId}'`);
          const query = `
            SELECT id FROM receipt_processing 
            WHERE transaction_id = $1 AND user_id = $2
          `;
          const result = await client.query(query, [params.transaction_id, userId]);
          if (result.rows.length > 0) {
            receiptId = result.rows[0].id;
          } else {
            // No receipt found for this transaction
            return {
              success: false,
              message: `No receipt data found for transaction ID ${params.transaction_id}. This transaction may not have been created from a scanned receipt, or the receipt processing failed.`
            };
          }
        } finally {
          client.release();
        }
      }
      
      if (!receiptId) {
        return {
          success: false,
          message: 'Receipt ID or Transaction ID is required to get receipt items. Please provide either receipt_id or transaction_id parameter.'
        };
      }
      
      const receipt = await this.receiptProcessingService.getReceiptById(receiptId, userId);
      
      if (!receipt) {
        return {
          success: false,
          message: `Receipt with ID ${receiptId} not found or you don't have permission to access it.`
        };
      }
      
      console.log('🔍 [ToolService] Retrieved receipt:', JSON.stringify(receipt, null, 2));
      console.log('🔍 [ToolService] Receipt parsed_data:', JSON.stringify(receipt.parsed_data, null, 2));
      
      // Handle different data structures
      const parsedData = receipt.parsed_data;
      const items = parsedData?.items || [];
      
      if (items.length === 0) {
        // Check if there's any receipt data at all
        if (!parsedData || Object.keys(parsedData).length === 0) {
          return {
            success: false,
            message: `Receipt ${receiptId} exists but contains no parsed data. The receipt may have failed to process correctly.`
          };
        }
        
        return {
          success: true,
          data: {
            receipt_id: receipt.id,
            merchant_name: parsedData?.merchantName || 'Unknown',
            total_amount: parsedData?.totalAmount || 0,
            currency: parsedData?.currency || 'USD',
            date: parsedData?.date || 'Unknown',
            items: []
          },
          message: `Receipt found from ${parsedData?.merchantName || 'Unknown merchant'} but no individual items were detected. Only transaction summary is available.`
        };
      }
      
      // Validate and clean items data
      const validItems = items.filter((item: any) => item && item.name && item.amount);
      
      return {
        success: true,
        data: {
          receipt_id: receipt.id,
          merchant_name: parsedData?.merchantName || 'Unknown',
          total_amount: parsedData?.totalAmount || 0,
          currency: parsedData?.currency || 'USD',
          date: parsedData?.date || 'Unknown',
          items: validItems
        },
        message: `Found ${validItems.length} individual items in the receipt from ${parsedData?.merchantName || 'Unknown merchant'}`
      };
    } catch (error) {
      console.error('Error getting receipt items:', error);
      return {
        success: false,
        message: `Failed to get receipt items: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
      };
    }
  }

  private async updateReceiptItems(params: any, userId: string): Promise<ToolResult> {
    try {
      let receiptId = params.receipt_id;
      
      // If transaction_id provided, find the related receipt
      if (!receiptId && params.transaction_id) {
        const client = await pool.connect();
        try {
          await client.query(`SET app.current_user_id = '${userId}'`);
          const query = `
            SELECT id FROM receipt_processing 
            WHERE transaction_id = $1 AND user_id = $2
          `;
          const result = await client.query(query, [params.transaction_id, userId]);
          if (result.rows.length > 0) {
            receiptId = result.rows[0].id;
          }
        } finally {
          client.release();
        }
      }
      
      if (!receiptId) {
        return {
          success: false,
          message: 'Receipt ID or Transaction ID is required to update receipt items'
        };
      }
      
      // Get current receipt data
      const receipt = await this.receiptProcessingService.getReceiptById(receiptId, userId);
      
      if (!receipt) {
        return {
          success: false,
          message: 'Receipt not found'
        };
      }
      
      // Validate items format
      if (!Array.isArray(params.items) || params.items.length === 0) {
        return {
          success: false,
          message: 'Items array is required and must contain at least one item'
        };
      }
      
      // Validate each item
      for (const item of params.items) {
        if (!item.name || typeof item.name !== 'string') {
          return {
            success: false,
            message: 'Each item must have a valid name'
          };
        }
        if (!item.amount || typeof item.amount !== 'number' || item.amount <= 0) {
          return {
            success: false,
            message: 'Each item must have a valid positive amount'
          };
        }
        if (item.quantity && (typeof item.quantity !== 'number' || item.quantity <= 0)) {
          return {
            success: false,
            message: 'Item quantity must be a positive number if provided'
          };
        }
      }
      
      // Update the parsed data
      const updatedParsedData = { ...receipt.parsed_data };
      
      // Update items
      updatedParsedData.items = params.items.map((item: any) => ({
        name: item.name,
        amount: item.amount,
        quantity: item.quantity || 1,
        category: item.category || 'other'
      }));
      
      // Update other fields if provided
      if (params.merchant_name) {
        updatedParsedData.merchantName = params.merchant_name;
      }
      if (params.total_amount) {
        updatedParsedData.totalAmount = params.total_amount;
      }
      if (params.currency) {
        updatedParsedData.currency = params.currency;
      }
      if (params.date) {
        updatedParsedData.date = params.date;
      }
      
      // Update database
      const client = await pool.connect();
      try {
        await client.query(`SET app.current_user_id = '${userId}'`);
        
        const updateQuery = `
          UPDATE receipt_processing 
          SET extracted_data = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND user_id = $3
          RETURNING *
        `;
        
        const updatedData = {
          extractedText: receipt.extracted_text,
          parsedData: updatedParsedData
        };
        
        const result = await client.query(updateQuery, [
          JSON.stringify(updatedData),
          receiptId,
          userId
        ]);
        
        if (result.rows.length === 0) {
          return {
            success: false,
            message: 'Receipt not found or you do not have permission to update it'
          };
        }
        
        return {
          success: true,
          data: {
            receipt_id: receiptId,
            merchant_name: updatedParsedData.merchantName,
            total_amount: updatedParsedData.totalAmount,
            currency: updatedParsedData.currency,
            date: updatedParsedData.date,
            items: updatedParsedData.items
          },
          message: `Successfully updated receipt with ${updatedParsedData.items?.length || 0} items`
        };
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Error updating receipt items:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update receipt items'
      };
    }
  }
}
