"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRService = void 0;
const tesseract_js_1 = require("tesseract.js");
const errorHandler_1 = require("../middleware/errorHandler");
class OCRService {
    constructor() {
        this.worker = null;
    }
    async initializeWorker() {
        if (this.worker) {
            console.log('🔍 [OCR] Worker already initialized, skipping');
            return;
        }
        console.log('🔍 [OCR] Initializing Tesseract worker...');
        const initStartTime = Date.now();
        try {
            this.worker = await (0, tesseract_js_1.createWorker)('eng');
            const initDuration = Date.now() - initStartTime;
            console.log('✅ [OCR] Worker initialized successfully in', initDuration + 'ms');
        }
        catch (error) {
            console.error('❌ [OCR] Failed to initialize worker:', error);
            throw (0, errorHandler_1.createError)('Failed to initialize OCR worker', 500);
        }
    }
    async extractTextFromImage(imageBuffer) {
        console.log('🔍 [OCR] Starting text extraction from image');
        console.log('🔍 [OCR] Image buffer size:', imageBuffer.length, 'bytes');
        try {
            await this.initializeWorker();
            if (!this.worker) {
                console.error('❌ [OCR] Worker not initialized after initialization attempt');
                throw (0, errorHandler_1.createError)('OCR worker not initialized', 500);
            }
            console.log('🔍 [OCR] Running Tesseract recognition...');
            const recognitionStartTime = Date.now();
            const { data: { text } } = await this.worker.recognize(imageBuffer);
            const recognitionDuration = Date.now() - recognitionStartTime;
            console.log('✅ [OCR] Recognition completed in', recognitionDuration + 'ms');
            console.log('🔍 [OCR] Raw extracted text length:', text.length);
            console.log('🔍 [OCR] Raw text preview:', text.substring(0, 300) + '...');
            console.log('🔍 [OCR] Cleaning extracted text...');
            const cleanedText = this.cleanExtractedText(text);
            console.log('✅ [OCR] Text cleaning completed');
            console.log('🔍 [OCR] Cleaned text length:', cleanedText.length);
            console.log('🔍 [OCR] Cleaned text preview:', cleanedText.substring(0, 300) + '...');
            return cleanedText;
        }
        catch (error) {
            console.error('❌ [OCR] Text extraction failed:', error);
            throw (0, errorHandler_1.createError)('Failed to extract text from image', 500);
        }
    }
    cleanExtractedText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\$\.\,\-\:\/]/g, '')
            .trim();
    }
    async terminateWorker() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
    }
}
exports.OCRService = OCRService;
//# sourceMappingURL=OCRService.js.map