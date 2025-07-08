import { Router } from 'express';
import { BudgetController } from '../controllers/BudgetController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createBudgetSchema, updateBudgetSchema } from '../validators/budgetValidators';

const router = Router();
const budgetController = new BudgetController();

router.use(authenticate as any);

router.get('/', (req, res, next) => budgetController.getBudgets(req as any, res, next));
router.post('/', validate(createBudgetSchema), (req, res, next) => budgetController.createBudget(req as any, res, next));
router.get('/:id', (req, res, next) => budgetController.getBudget(req as any, res, next));
router.put('/:id', validate(updateBudgetSchema), (req, res, next) => budgetController.updateBudget(req as any, res, next));
router.delete('/:id', (req, res, next) => budgetController.deleteBudget(req as any, res, next));
router.get('/:id/status', (req, res, next) => budgetController.getBudgetStatus(req as any, res, next));

export { router as budgetRoutes };