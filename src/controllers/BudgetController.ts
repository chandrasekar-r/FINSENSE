import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BudgetService } from '../services/BudgetService';
import { NotificationService } from '../services/NotificationService';
import { createError } from '../middleware/errorHandler';

export class BudgetController {
  private budgetService: BudgetService;
  private notificationService: NotificationService;

  constructor() {
    this.budgetService = new BudgetService();
    this.notificationService = new NotificationService();
  }

  async getBudgets(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { includeStatus = true } = req.query;

      const budgets = await this.budgetService.getBudgets(userId, includeStatus === 'true');

      console.log('🔍 [BudgetController] Returning budgets for user:', userId);
      console.log('🔍 [BudgetController] Budget count:', budgets.length);
      console.log('🔍 [BudgetController] Budget data:', budgets);

      res.json({
        success: true,
        data: budgets,
      });
    } catch (error) {
      next(error);
    }
  }

  async createBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const budgetData = req.body;

      const budget = await this.budgetService.createBudget(userId, budgetData);

      res.status(201).json({
        success: true,
        data: budget,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const budget = await this.budgetService.getBudgetById(id!, userId);

      if (!budget) {
        throw createError('Budget not found', 404);
      }

      res.json({
        success: true,
        data: budget,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const budget = await this.budgetService.updateBudget(id!, userId, updateData);

      res.json({
        success: true,
        data: budget,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBudget(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await this.budgetService.deleteBudget(id!, userId);

      res.json({
        success: true,
        message: 'Budget deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getBudgetStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const status = await this.budgetService.getBudgetStatus(id!, userId);

      if (!status) {
        throw createError('Budget not found', 404);
      }

      // Check for alerts and send notifications if needed
      if (status.alertTriggered) {
        await this.notificationService.sendBudgetAlert(userId, status);
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}