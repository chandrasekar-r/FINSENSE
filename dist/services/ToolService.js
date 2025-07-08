"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolService = void 0;
const TransactionService_1 = require("./TransactionService");
const BudgetService_1 = require("./BudgetService");
const CategoryService_1 = require("./CategoryService");
class ToolService {
    constructor() {
        this.transactionService = new TransactionService_1.TransactionService();
        this.budgetService = new BudgetService_1.BudgetService();
        this.categoryService = new CategoryService_1.CategoryService();
    }
    getAvailableTools() {
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
                description: 'Get transactions with optional filters',
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
            }
        ];
    }
    async executeTool(toolName, parameters, userId) {
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
                default:
                    return {
                        success: false,
                        message: `Unknown tool: ${toolName}`
                    };
            }
        }
        catch (error) {
            console.error(`Tool execution error (${toolName}):`, error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Tool execution failed'
            };
        }
    }
    async addTransaction(params, userId) {
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
    async updateTransaction(params, userId) {
        const transaction = await this.transactionService.updateTransaction(params.transaction_id, userId, {
            amount: params.amount,
            description: params.description,
            category_id: params.category_id,
            transaction_type: params.transaction_type,
            merchant_name: params.merchant_name
        });
        return {
            success: true,
            data: transaction,
            message: `Updated transaction successfully`
        };
    }
    async deleteTransaction(params, userId) {
        await this.transactionService.deleteTransaction(params.transaction_id, userId);
        return {
            success: true,
            message: `Deleted transaction successfully`
        };
    }
    async createBudget(params, userId) {
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
    async updateBudget(params, userId) {
        let budgetId = params.budget_id;
        if (!budgetId) {
            const budgets = await this.budgetService.getBudgets(userId, false);
            if (params.budget_name) {
                const budget = budgets.find((b) => b.name.toLowerCase().includes(params.budget_name.toLowerCase()));
                if (budget)
                    budgetId = budget.id;
            }
            else if (params.category_name) {
                const budget = budgets.find((b) => b.category_name && b.category_name.toLowerCase().includes(params.category_name.toLowerCase()));
                if (budget)
                    budgetId = budget.id;
            }
            if (!budgetId) {
                return {
                    success: false,
                    message: `Could not find budget. Available budgets: ${budgets.map((b) => `${b.name} (${b.category_name})`).join(', ')}`
                };
            }
        }
        const updateData = {};
        if (params.name !== undefined)
            updateData.name = params.name;
        if (params.amount !== undefined)
            updateData.amount = params.amount;
        if (params.currency !== undefined)
            updateData.currency = params.currency;
        if (params.alert_threshold !== undefined)
            updateData.alert_threshold = params.alert_threshold;
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
    async deleteBudget(params, userId) {
        await this.budgetService.deleteBudget(params.budget_id, userId);
        return {
            success: true,
            message: `Deleted budget successfully`
        };
    }
    async createCategory(params, userId) {
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
    async getTransactions(params, userId) {
        const filters = {};
        const limit = params.limit || 10;
        if (params.category)
            filters.category = params.category;
        if (params.start_date)
            filters.startDate = params.start_date;
        if (params.end_date)
            filters.endDate = params.end_date;
        if (params.transaction_type)
            filters.type = params.transaction_type;
        const transactions = await this.transactionService.getTransactions(userId, 1, limit, filters);
        return {
            success: true,
            data: transactions,
            message: `Found ${transactions.transactions?.length || 0} transactions`
        };
    }
    async getSpendingAnalysis(params, userId) {
        const period = params.period || 'month';
        const spendingSummary = await this.transactionService.getSpendingSummary(userId, period);
        const categoryBreakdown = await this.transactionService.getCategorySummary(userId, period);
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
    async getBudgets(params, userId) {
        const budgets = await this.budgetService.getBudgets(userId, true);
        let filteredBudgets = budgets;
        if (params.category_name) {
            filteredBudgets = budgets.filter((budget) => budget.category_name.toLowerCase().includes(params.category_name.toLowerCase()));
        }
        return {
            success: true,
            data: filteredBudgets,
            message: `Found ${filteredBudgets.length} budget(s)`
        };
    }
    async createBudgetWithCategory(params, userId) {
        try {
            const allCategories = await this.categoryService.getUserCategories(userId);
            let category = allCategories.find((c) => c.name.toLowerCase() === params.category_name.toLowerCase());
            if (!category) {
                category = await this.categoryService.createCategory(userId, {
                    name: params.category_name,
                    color: params.category_color || '#10B981',
                    icon: params.category_icon || 'map'
                });
                console.log('Created new category:', category);
            }
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
        }
        catch (error) {
            console.error('Error creating budget with category:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create budget with category'
            };
        }
    }
}
exports.ToolService = ToolService;
//# sourceMappingURL=ToolService.js.map