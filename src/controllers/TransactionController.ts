import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TransactionService } from '../services/TransactionService';
import { DeepSeekService } from '../services/DeepSeekService';
import { createError } from '../middleware/errorHandler';

export class TransactionController {
  private transactionService: TransactionService;
  private deepSeekService: DeepSeekService;

  constructor() {
    this.transactionService = new TransactionService();
    this.deepSeekService = new DeepSeekService();
  }

  async getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, category, startDate, endDate, type } = req.query;

      const filters = {
        category: category as string,
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as string
      };

      const transactions = await this.transactionService.getTransactions(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const transactionData = req.body;

      // Handle merchant_name to vendor_name mapping for backwards compatibility
      if (transactionData.merchant_name && !transactionData.vendor_name) {
        transactionData.vendor_name = transactionData.merchant_name;
      }

      // Handle category conversion
      if (transactionData.category_id) {
        // Check if category_id is actually a UUID or a category name
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(transactionData.category_id)) {
          // It's a category name, convert to ID
          const categoryId = await this.transactionService.getCategoryIdByName(userId, transactionData.category_id);
          if (categoryId) {
            transactionData.category_id = categoryId;
          } else {
            // Category doesn't exist, we'll let validation handle this
            transactionData.category_id = null;
          }
        }
      }

      // Auto-suggest category if not provided
      if (!transactionData.category_id && transactionData.description) {
        const suggestedCategory = await this.deepSeekService.suggestCategory(
          transactionData.description,
          transactionData.amount
        );
        
        // Get category ID for suggested category
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
    } catch (error) {
      next(error);
    }
  }

  async getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const transaction = await this.transactionService.getTransactionById(id!, userId);

      if (!transaction) {
        throw createError('Transaction not found', 404);
      }

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const transaction = await this.transactionService.updateTransaction(id!, userId, updateData);

      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await this.transactionService.deleteTransaction(id!, userId);

      res.json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getSpendingSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query;

      const summary = await this.transactionService.getSpendingSummary(userId, period as string);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCategorySummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { period = 'month' } = req.query;

      const summary = await this.transactionService.getCategorySummary(userId, period as string);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }
}