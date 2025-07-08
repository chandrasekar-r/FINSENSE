import { Router } from 'express';
import { CategoryController } from '../controllers/CategoryController';
import { authenticate } from '../middleware/auth';

const router = Router();
const categoryController = new CategoryController();

router.use(authenticate as any);

router.get('/', (req, res, next) => categoryController.getCategories(req as any, res, next));
router.post('/', (req, res, next) => categoryController.createCategory(req as any, res, next));
router.put('/:id', (req, res, next) => categoryController.updateCategory(req as any, res, next));
router.delete('/:id', (req, res, next) => categoryController.deleteCategory(req as any, res, next));

export { router as categoryRoutes };