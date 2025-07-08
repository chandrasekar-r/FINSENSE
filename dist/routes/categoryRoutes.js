"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRoutes = void 0;
const express_1 = require("express");
const CategoryController_1 = require("../controllers/CategoryController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
exports.categoryRoutes = router;
const categoryController = new CategoryController_1.CategoryController();
router.use(auth_1.authenticate);
router.get('/', (req, res, next) => categoryController.getCategories(req, res, next));
router.post('/', (req, res, next) => categoryController.createCategory(req, res, next));
router.put('/:id', (req, res, next) => categoryController.updateCategory(req, res, next));
router.delete('/:id', (req, res, next) => categoryController.deleteCategory(req, res, next));
//# sourceMappingURL=categoryRoutes.js.map