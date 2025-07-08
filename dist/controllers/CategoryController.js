"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const CategoryService_1 = require("../services/CategoryService");
const errorHandler_1 = require("../middleware/errorHandler");
class CategoryController {
    constructor() {
        this.categoryService = new CategoryService_1.CategoryService();
    }
    async getCategories(req, res, next) {
        try {
            const userId = req.user.id;
            const categories = await this.categoryService.getUserCategories(userId);
            res.json({
                success: true,
                data: categories,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createCategory(req, res, next) {
        try {
            const userId = req.user.id;
            const { name, color, icon } = req.body;
            if (!name) {
                throw (0, errorHandler_1.createError)('Category name is required', 400);
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
        }
        catch (error) {
            next(error);
        }
    }
    async updateCategory(req, res, next) {
        try {
            const userId = req.user.id;
            const categoryId = req.params.id;
            const updateData = req.body;
            const category = await this.categoryService.updateCategory(categoryId, userId, updateData);
            res.json({
                success: true,
                data: category,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteCategory(req, res, next) {
        try {
            const userId = req.user.id;
            const categoryId = req.params.id;
            await this.categoryService.deleteCategory(categoryId, userId);
            res.json({
                success: true,
                message: 'Category deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=CategoryController.js.map