"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetRoutes = void 0;
const express_1 = require("express");
const BudgetController_1 = require("../controllers/BudgetController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const budgetValidators_1 = require("../validators/budgetValidators");
const router = (0, express_1.Router)();
exports.budgetRoutes = router;
const budgetController = new BudgetController_1.BudgetController();
router.use(auth_1.authenticate);
router.get('/', (req, res, next) => budgetController.getBudgets(req, res, next));
router.post('/', (0, validate_1.validate)(budgetValidators_1.createBudgetSchema), (req, res, next) => budgetController.createBudget(req, res, next));
router.get('/:id', (req, res, next) => budgetController.getBudget(req, res, next));
router.put('/:id', (0, validate_1.validate)(budgetValidators_1.updateBudgetSchema), (req, res, next) => budgetController.updateBudget(req, res, next));
router.delete('/:id', (req, res, next) => budgetController.deleteBudget(req, res, next));
router.get('/:id/status', (req, res, next) => budgetController.getBudgetStatus(req, res, next));
//# sourceMappingURL=budgetRoutes.js.map