"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRoutes = void 0;
const express_1 = require("express");
const ChatController_1 = require("../controllers/ChatController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const chatValidators_1 = require("../validators/chatValidators");
const router = (0, express_1.Router)();
exports.chatRoutes = router;
const chatController = new ChatController_1.ChatController();
router.use(auth_1.authenticate);
router.post('/query', (0, validate_1.validate)(chatValidators_1.chatQuerySchema), (req, res, next) => chatController.processQuery(req, res, next));
router.post('/query/stream', (0, validate_1.validate)(chatValidators_1.chatQuerySchema), (req, res, next) => chatController.processQueryStream(req, res, next));
router.get('/history', (req, res, next) => chatController.getChatHistory(req, res, next));
router.delete('/history', (req, res, next) => chatController.clearChatHistory(req, res, next));
//# sourceMappingURL=chatRoutes.js.map