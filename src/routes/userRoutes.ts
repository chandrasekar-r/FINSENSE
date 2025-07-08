import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateUserSchema } from '../validators/userValidators';

const router = Router();
const userController = new UserController();

router.use(authenticate as any);

router.get('/profile', (req, res, next) => userController.getProfile(req as any, res, next));
router.put('/profile', validate(updateUserSchema), (req, res, next) => userController.updateProfile(req as any, res, next));
router.delete('/profile', (req, res, next) => userController.deleteAccount(req as any, res, next));
router.get('/settings', (req, res, next) => userController.getSettings(req as any, res, next));
router.put('/settings', (req, res, next) => userController.updateSettings(req as any, res, next));

export { router as userRoutes };