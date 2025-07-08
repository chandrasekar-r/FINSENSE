export declare class OCRService {
    private worker;
    initializeWorker(): Promise<void>;
    extractTextFromImage(imageBuffer: Buffer): Promise<string>;
    private cleanExtractedText;
    terminateWorker(): Promise<void>;
}
//# sourceMappingURL=OCRService.d.ts.map