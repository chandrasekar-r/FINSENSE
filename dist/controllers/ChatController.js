"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatController = void 0;
const DeepSeekService_1 = require("../services/DeepSeekService");
const ChatService_1 = require("../services/ChatService");
const errorHandler_1 = require("../middleware/errorHandler");
class ChatController {
    constructor() {
        this.deepSeekService = new DeepSeekService_1.DeepSeekService();
        this.chatService = new ChatService_1.ChatService();
    }
    async processQuery(req, res, next) {
        try {
            const { message } = req.body;
            const userId = req.user.id;
            if (!message || message.trim().length === 0) {
                throw (0, errorHandler_1.createError)('Message is required', 400);
            }
            const financialContext = await this.chatService.getUserFinancialContext(userId);
            const response = await this.deepSeekService.processFinancialQuery(message, financialContext, userId);
            await this.chatService.saveChatInteraction(userId, message, response);
            res.json({
                success: true,
                data: {
                    response,
                    timestamp: new Date().toISOString(),
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async processQueryStream(req, res, next) {
        try {
            const { message } = req.body;
            const userId = req.user.id;
            if (!message || message.trim().length === 0) {
                throw (0, errorHandler_1.createError)('Message is required', 400);
            }
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });
            res.write('data: {"type": "connected"}\n\n');
            try {
                const financialContext = await this.chatService.getUserFinancialContext(userId);
                const history = await this.chatService.getChatHistory(userId, 1, 5);
                let fullResponse = '';
                await this.deepSeekService.processFinancialQueryStream(message, financialContext, (chunk) => {
                    fullResponse += chunk;
                    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
                }, userId, history.messages);
                await this.chatService.saveChatInteraction(userId, message, fullResponse);
                res.write(`data: ${JSON.stringify({
                    type: 'complete',
                    fullResponse,
                    timestamp: new Date().toISOString()
                })}\n\n`);
            }
            catch (error) {
                res.write(`data: ${JSON.stringify({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error occurred'
                })}\n\n`);
            }
            res.end();
        }
        catch (error) {
            next(error);
        }
    }
    async getChatHistory(req, res, next) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;
            const history = await this.chatService.getChatHistory(userId, parseInt(page), parseInt(limit));
            res.json({
                success: true,
                data: history,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async clearChatHistory(req, res, next) {
        try {
            const userId = req.user.id;
            await this.chatService.clearChatHistory(userId);
            res.json({
                success: true,
                message: 'Chat history cleared successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ChatController = ChatController;
//# sourceMappingURL=ChatController.js.map