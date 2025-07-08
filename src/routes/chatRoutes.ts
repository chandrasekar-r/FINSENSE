import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { chatQuerySchema } from '../validators/chatValidators';

const router = Router();
const chatController = new ChatController();

router.use(authenticate as any);

router.post('/query', validate(chatQuerySchema), (req, res, next) => chatController.processQuery(req as any, res, next));
router.post('/query/stream', validate(chatQuerySchema), (req, res, next) => chatController.processQueryStream(req as any, res, next));
router.get('/history', (req, res, next) => chatController.getChatHistory(req as any, res, next));
router.delete('/history', (req, res, next) => chatController.clearChatHistory(req as any, res, next));

export { router as chatRoutes };