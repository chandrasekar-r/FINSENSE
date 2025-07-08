"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionController = void 0;
const TransactionService_1 = require("../services/TransactionService");
const DeepSeekService_1 = require("../services/DeepSeekService");
const errorHandler_1 = require("../middleware/errorHandler");
class TransactionController {
    constructor() {
        this.transactionService = new TransactionService_1.TransactionService();
        this.deepSeekService = new DeepSeekService_1.DeepSeekService();
    }
    async getTransactions(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, category, startDate, endDate, type } = req.query;
            const filters = {
                category: category,
                startDate: startDate,
                endDate: endDate,
                type: type
            };
            const transactions = await this.transactionService.getTransactions(userId, parseInt(page), parseInt(limit), filters);
            res.json({
                success: true,
                data: transactions,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createTransaction(req, res, next) {
        try {
            const userId = req.user.id;
            const transactionData = req.body;
            if (transactionData.merchant_name && !transactionData.vendor_name) {
                transactionData.vendor_name = transactionData.merchant_name;
            }
            if (transactionData.category_id) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(transactionData.category_id)) {
                    const categoryId = await this.transactionService.getCategoryIdByName(userId, transactionData.category_id);
                    if (categoryId) {
                        transactionData.category_id = categoryId;
                    }
                    else {
                        transactionData.category_id = null;
                    }
                }
            }
            if (!transactionData.category_id && transactionData.description) {
                const suggestedCategory = await this.deepSeekService.suggestCategory(transactionData.description, transactionData.amount);
                const categoryId = await this.transactionService.getCategoryIdByName(userId, suggestedCategory);
                if (categoryId) {
                    transactionData.category_id = categoryId;
                }
            }
            const transaction = await this.transactionService.createTransaction(userId, transactionData);
            res.status(201).json({
                success: true,
                data: transaction,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTransaction(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const transaction = await this.transactionService.getTransactionById(id, userId);
            if (!transaction) {
                throw (0, errorHandler_1.createError)('Transaction not found', 404);
            }
            res.json({
                success: true,
                data: transaction,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTransaction(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;
            const transaction = await this.transactionService.updateTransaction(id, userId, updateData);
            res.json({
                success: true,
                data: transaction,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteTransaction(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            await this.transactionService.deleteTransaction(id, userId);
            res.json({
                success: true,
                message: 'Transaction deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSpendingSummary(req, res, next) {
        try {
            const userId = req.user.id;
            const { period = 'month' } = req.query;
            const summary = await this.transactionService.getSpendingSummary(userId, period);
            res.json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCategorySummary(req, res, next) {
        try {
            const userId = req.user.id;
            const { period = 'month' } = req.query;
            const summary = await this.transactionService.getCategorySummary(userId, period);
            res.json({
                success: true,
                data: summary,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.TransactionController = TransactionController;
//# sourceMappingURL=TransactionController.js.map