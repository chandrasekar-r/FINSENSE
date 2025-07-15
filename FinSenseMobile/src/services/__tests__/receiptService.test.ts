import { jest } from '@jest/globals';
import { receiptService } from '../receiptService';
import { CameraResult } from '../cameraService';

// Mock the api module
jest.mock('../../lib/api', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('ReceiptService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadReceipt', () => {
    it('should upload receipt successfully', async () => {
      const mockApi = require('../../lib/api').api;
      const mockImageResult: CameraResult = {
        uri: 'file://test.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        type: 'image/jpeg',
        width: 1920,
        height: 1080,
      };

      mockApi.post.mockResolvedValue({
        data: {
          transactionId: 'tx-123',
          processingId: 'proc-456',
          message: 'Receipt uploaded successfully',
        },
      });

      const result = await receiptService.uploadReceipt(mockImageResult);

      expect(result).toEqual({
        success: true,
        transactionId: 'tx-123',
        processingId: 'proc-456',
        message: 'Receipt uploaded successfully',
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        '/receipts/upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        })
      );
    });

    it('should handle upload failure', async () => {
      const mockApi = require('../../lib/api').api;
      const mockImageResult: CameraResult = {
        uri: 'file://test.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        type: 'image/jpeg',
        width: 1920,
        height: 1080,
      };

      const error = new Error('Network error');
      mockApi.post.mockRejectedValue(error);

      const result = await receiptService.uploadReceipt(mockImageResult);

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

  describe('getProcessingStatus', () => {
    it('should fetch processing status successfully', async () => {
      const mockApi = require('../../lib/api').api;
      const processingId = 'proc-123';
      const mockStatus = {
        id: processingId,
        status: 'processing',
        progress: 50,
      };

      mockApi.get.mockResolvedValue({
        data: mockStatus,
      });

      const result = await receiptService.getProcessingStatus(processingId);

      expect(result).toEqual(mockStatus);
      expect(mockApi.get).toHaveBeenCalledWith(`/receipts/processing/${processingId}`);
    });

    it('should handle fetch error', async () => {
      const mockApi = require('../../lib/api').api;
      const processingId = 'proc-123';
      const error = new Error('API error');

      mockApi.get.mockRejectedValue(error);

      await expect(receiptService.getProcessingStatus(processingId)).rejects.toThrow('Failed to fetch processing status');
    });
  });

  describe('retryProcessing', () => {
    it('should retry processing successfully', async () => {
      const mockApi = require('../../lib/api').api;
      const processingId = 'proc-123';

      mockApi.post.mockResolvedValue({
        data: {
          processingId: 'proc-456',
          message: 'Receipt processing restarted',
        },
      });

      const result = await receiptService.retryProcessing(processingId);

      expect(result).toEqual({
        success: true,
        processingId: 'proc-456',
        message: 'Receipt processing restarted',
      });

      expect(mockApi.post).toHaveBeenCalledWith(`/receipts/retry/${processingId}`);
    });

    it('should handle retry failure', async () => {
      const mockApi = require('../../lib/api').api;
      const processingId = 'proc-123';
      const error = new Error('Retry failed');

      mockApi.post.mockRejectedValue(error);

      const result = await receiptService.retryProcessing(processingId);

      expect(result).toEqual({
        success: false,
        error: 'Failed to retry processing. Please try again.',
      });
    });
  });
});