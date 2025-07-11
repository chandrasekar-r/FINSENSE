import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { OCRService } from '../services/OCRService';
import { DeepSeekService } from '../services/DeepSeekService';
import { ReceiptProcessingService } from '../services/ReceiptProcessingService';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { setReceiptProgress, getReceiptProgress } from '../services/ReceiptProcessingService';
import express from 'express';

export class ReceiptController {
  private ocrService: OCRService;
  private deepSeekService: DeepSeekService;
  private receiptService: ReceiptProcessingService;

  constructor() {
    this.ocrService = new OCRService();
    this.deepSeekService = new DeepSeekService();
    this.receiptService = new ReceiptProcessingService();
  }

  async uploadReceipt(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();
    const jobId = uuidv4();
    await setReceiptProgress(jobId, 0, 'processing');
    console.log('🔍 [Receipt Upload] Starting receipt upload process');
    
    try {
      console.log('🔍 [Receipt Upload] Step 1: Validating request');
      if (!req.file) {
        console.log('❌ [Receipt Upload] Error: No file uploaded');
        throw createError('Receipt image is required', 400);
      }

      const userId = req.user.id;
      const receiptBuffer = req.file.buffer;
      
      console.log('🔍 [Receipt Upload] File details:', {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        userId: userId
      });

      await setReceiptProgress(jobId, 10, 'processing');

      console.log('🔍 [Receipt Upload] Step 2: Starting OCR text extraction');
      const ocrStartTime = Date.now();
      const extractedText = await this.ocrService.extractTextFromImage(receiptBuffer);
      await setReceiptProgress(jobId, 30, 'processing');
      const ocrDuration = Date.now() - ocrStartTime;
      
      console.log('✅ [Receipt Upload] OCR completed in', ocrDuration + 'ms');
      console.log('🔍 [Receipt Upload] Extracted text length:', extractedText.length);
      console.log('🔍 [Receipt Upload] Extracted text preview:', extractedText.substring(0, 200) + '...');

      console.log('🔍 [Receipt Upload] Step 3: Starting AI parsing with DeepSeek');
      const aiStartTime = Date.now();
      
      // More granular progress updates during AI processing
      await setReceiptProgress(jobId, 40, 'processing');
      console.log('🔍 [Receipt Upload] AI processing: Starting merchant and total extraction');
      
      const parsedData = await this.deepSeekService.parseReceiptData(extractedText);
      
      // Update progress based on what we received
      if (parsedData.merchantName && parsedData.totalAmount) {
        await setReceiptProgress(jobId, 50, 'processing');
        console.log('🔍 [Receipt Upload] AI processing: Merchant and total extracted');
      }
      
      if (parsedData.items && parsedData.items.length > 0) {
        await setReceiptProgress(jobId, 60, 'processing');
        console.log('🔍 [Receipt Upload] AI processing: Items extracted');
      }
      
      await setReceiptProgress(jobId, 70, 'processing');
      const aiDuration = Date.now() - aiStartTime;
      
      console.log('✅ [Receipt Upload] AI parsing completed in', aiDuration + 'ms');
      console.log('🔍 [Receipt Upload] Parsed data:', JSON.stringify(parsedData, null, 2));

      console.log('🔍 [Receipt Upload] Step 4: Saving receipt record to database');
      const dbStartTime = Date.now();
      const receiptRecord = await this.receiptService.createReceiptRecord(
        userId,
        req.file.originalname,
        req.file.mimetype,
        extractedText,
        parsedData
      );
      await setReceiptProgress(jobId, 100, 'completed');
      const dbDuration = Date.now() - dbStartTime;
      
      console.log('✅ [Receipt Upload] Database save completed in', dbDuration + 'ms');
      console.log('🔍 [Receipt Upload] Receipt record ID:', receiptRecord.id);

      const totalDuration = Date.now() - startTime;
      console.log('🎉 [Receipt Upload] Process completed successfully in', totalDuration + 'ms');
      console.log('🔍 [Receipt Upload] Performance breakdown:', {
        ocr: ocrDuration + 'ms',
        ai: aiDuration + 'ms', 
        database: dbDuration + 'ms',
        total: totalDuration + 'ms'
      });

      res.json({
        success: true,
        jobId,
        data: {
          receiptId: receiptRecord.id,
          extractedText,
          parsedData,
          status: 'processed',
          processingTime: {
            ocr: ocrDuration,
            ai: aiDuration,
            database: dbDuration,
            total: totalDuration
          }
        },
      });
    } catch (error) {
      await setReceiptProgress(jobId, 100, 'error');
      const totalDuration = Date.now() - startTime;
      console.error('❌ [Receipt Upload] Process failed after', totalDuration + 'ms');
      console.error('❌ [Receipt Upload] Error details:', error);
      next(error);
    }
  }

  async getReceiptData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const receiptData = await this.receiptService.getReceiptById(id!, userId);

      if (!receiptData) {
        throw createError('Receipt not found', 404);
      }

      res.json({
        success: true,
        data: receiptData,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmReceiptData(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { confirmedData } = req.body;

      // Create transaction from confirmed receipt data
      const transaction = await this.receiptService.createTransactionFromReceipt(
        id!,
        userId,
        confirmedData
      );

      res.json({
        success: true,
        data: {
          transactionId: transaction.id,
          message: 'Receipt data confirmed and transaction created',
        },
      });
    } catch (error) {
      next(error);
    }
  }
}