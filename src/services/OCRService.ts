import { createWorker, Worker } from 'tesseract.js';
import { createError } from '../middleware/errorHandler';

export class OCRService {
  private worker: Worker | null = null;

  async initializeWorker(): Promise<void> {
    if (this.worker) {
      console.log('🔍 [OCR] Worker already initialized, skipping');
      return;
    }

    console.log('🔍 [OCR] Initializing Tesseract worker...');
    const initStartTime = Date.now();
    
    try {
      this.worker = await createWorker('eng');
      const initDuration = Date.now() - initStartTime;
      console.log('✅ [OCR] Worker initialized successfully in', initDuration + 'ms');
    } catch (error) {
      console.error('❌ [OCR] Failed to initialize worker:', error);
      throw createError('Failed to initialize OCR worker', 500);
    }
  }

  async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
    console.log('🔍 [OCR] Starting text extraction from image');
    console.log('🔍 [OCR] Image buffer size:', imageBuffer.length, 'bytes');
    
    try {
      await this.initializeWorker();
      
      if (!this.worker) {
        console.error('❌ [OCR] Worker not initialized after initialization attempt');
        throw createError('OCR worker not initialized', 500);
      }

      console.log('🔍 [OCR] Running Tesseract recognition...');
      const recognitionStartTime = Date.now();
      
      const { data: { text } } = await this.worker.recognize(imageBuffer);
      const recognitionDuration = Date.now() - recognitionStartTime;
      
      console.log('✅ [OCR] Recognition completed in', recognitionDuration + 'ms');
      console.log('🔍 [OCR] Raw extracted text length:', text.length);
      console.log('🔍 [OCR] Raw text preview:', text.substring(0, 300) + '...');
      
      // Clean up extracted text
      console.log('🔍 [OCR] Cleaning extracted text...');
      const cleanedText = this.cleanExtractedText(text);
      
      console.log('✅ [OCR] Text cleaning completed');
      console.log('🔍 [OCR] Cleaned text length:', cleanedText.length);
      console.log('🔍 [OCR] Cleaned text preview:', cleanedText.substring(0, 300) + '...');
      
      return cleanedText;
    } catch (error) {
      console.error('❌ [OCR] Text extraction failed:', error);
      throw createError('Failed to extract text from image', 500);
    }
  }

  private cleanExtractedText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple whitespaces with single space
      .replace(/[^\w\s\$\.\,\-\:\/]/g, '') // Keep only alphanumeric, spaces, and common receipt symbols
      .trim();
  }

  async terminateWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}