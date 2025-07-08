import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { DeepSeekService } from '../services/DeepSeekService';
import { ChatService } from '../services/ChatService';
import { createError } from '../middleware/errorHandler';

export class ChatController {
  private deepSeekService: DeepSeekService;
  private chatService: ChatService;

  constructor() {
    this.deepSeekService = new DeepSeekService();
    this.chatService = new ChatService();
  }

  async processQuery(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message } = req.body;
      const userId = req.user.id;

      if (!message || message.trim().length === 0) {
        throw createError('Message is required', 400);
      }

      // Get user's financial context for better responses
      const financialContext = await this.chatService.getUserFinancialContext(userId);
      
      // Process query with DeepSeek
      const response = await this.deepSeekService.processFinancialQuery(message, financialContext, userId);
      
      // Save chat interaction to database
      await this.chatService.saveChatInteraction(userId, message, response);

      res.json({
        success: true,
        data: {
          response,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async processQueryStream(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message } = req.body;
      const userId = req.user.id;

      if (!message || message.trim().length === 0) {
        throw createError('Message is required', 400);
      }

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connected event
      res.write('data: {"type": "connected"}\n\n');

      try {
        // Get user's financial context for better responses
        const financialContext = await this.chatService.getUserFinancialContext(userId);
        
        // Get recent chat history for context
        const history = await this.chatService.getChatHistory(userId, 1, 5); // Get last 5 messages

        // Process query with streaming
        let fullResponse = '';
        await this.deepSeekService.processFinancialQueryStream(
          message, 
          financialContext,
          (chunk: string) => {
            fullResponse += chunk;
            // Send chunk to client
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
          },
          userId,
          history.messages
        );
        
        // Save complete interaction to database
        await this.chatService.saveChatInteraction(userId, message, fullResponse);

        // Send completion event
        res.write(`data: ${JSON.stringify({ 
          type: 'complete', 
          fullResponse,
          timestamp: new Date().toISOString() 
        })}\n\n`);
        
      } catch (error) {
        // Send error event
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error occurred' 
        })}\n\n`);
      }

      res.end();
    } catch (error) {
      next(error);
    }
  }

  async getChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      const history = await this.chatService.getChatHistory(
        userId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  async clearChatHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user.id;
      
      await this.chatService.clearChatHistory(userId);

      res.json({
        success: true,
        message: 'Chat history cleared successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}