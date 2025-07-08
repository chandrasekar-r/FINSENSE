import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CategoryService } from '../services/CategoryService';
import { createError } from '../middleware/errorHandler';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  async getCategories(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const categories = await this.categoryService.getUserCategories(userId);
      
      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  async createCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { name, color, icon } = req.body;

      if (!name) {
        throw createError('Category name is required', 400);
      }

      const category = await this.categoryService.createCategory(userId, {
        name,
        color: color || '#6B7280',
        icon: icon || 'folder'
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const categoryId = req.params.id!;
      const updateData = req.body;

      const category = await this.categoryService.updateCategory(categoryId, userId, updateData);

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const categoryId = req.params.id!;

      await this.categoryService.deleteCategory(categoryId, userId);

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}