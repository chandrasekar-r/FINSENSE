import { Router } from 'express';
import { TransactionController } from '../controllers/TransactionController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTransactionSchema, updateTransactionSchema } from '../validators/transactionValidators';

const router = Router();
const transactionController = new TransactionController();

router.use(authenticate as any);

router.get('/', (req, res, next) => transactionController.getTransactions(req as any, res, next));
router.post('/', validate(createTransactionSchema), (req, res, next) => transactionController.createTransaction(req as any, res, next));
router.get('/:id', (req, res, next) => transactionController.getTransaction(req as any, res, next));
router.put('/:id', validate(updateTransactionSchema), (req, res, next) => transactionController.updateTransaction(req as any, res, next));
router.delete('/:id', (req, res, next) => transactionController.deleteTransaction(req as any, res, next));
router.get('/summary/spending', (req, res, next) => transactionController.getSpendingSummary(req as any, res, next));
router.get('/summary/categories', (req, res, next) => transactionController.getCategorySummary(req as any, res, next));

export { router as transactionRoutes };