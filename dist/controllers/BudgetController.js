"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BudgetController = void 0;
const BudgetService_1 = require("../services/BudgetService");
const NotificationService_1 = require("../services/NotificationService");
const errorHandler_1 = require("../middleware/errorHandler");
class BudgetController {
    constructor() {
        this.budgetService = new BudgetService_1.BudgetService();
        this.notificationService = new NotificationService_1.NotificationService();
    }
    async getBudgets(req, res, next) {
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
        }
        catch (error) {
            next(error);
        }
    }
    async createBudget(req, res, next) {
        try {
            const userId = req.user.id;
            const budgetData = req.body;
            const budget = await this.budgetService.createBudget(userId, budgetData);
            res.status(201).json({
                success: true,
                data: budget,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getBudget(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const budget = await this.budgetService.getBudgetById(id, userId);
            if (!budget) {
                throw (0, errorHandler_1.createError)('Budget not found', 404);
            }
            res.json({
                success: true,
                data: budget,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateBudget(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;
            const budget = await this.budgetService.updateBudget(id, userId, updateData);
            res.json({
                success: true,
                data: budget,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteBudget(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            await this.budgetService.deleteBudget(id, userId);
            res.json({
                success: true,
                message: 'Budget deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getBudgetStatus(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const status = await this.budgetService.getBudgetStatus(id, userId);
            if (!status) {
                throw (0, errorHandler_1.createError)('Budget not found', 404);
            }
            if (status.alertTriggered) {
                await this.notificationService.sendBudgetAlert(userId, status);
            }
            res.json({
                success: true,
                data: status,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BudgetController = BudgetController;
//# sourceMappingURL=BudgetController.js.map