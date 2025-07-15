import { api } from '../lib/api';
import { CameraResult } from './cameraService';

export interface ReceiptUploadResult {
  success: boolean;
  transactionId?: string;
  processingId?: string;
  message?: string;
  error?: string;
}

export interface ReceiptProcessingStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    transactionId: string;
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      category: string;
      items: Array<{
        name: string;
        quantity: number;
        price: number;
      }>;
    };
  };
  error?: string;
}

class ReceiptService {
  async uploadReceipt(imageResult: CameraResult): Promise<ReceiptUploadResult> {
    try {
      const formData = new FormData();
      
      // Add the image file
      formData.append('receipt_image', {
        uri: imageResult.uri,
        type: imageResult.type,
        name: imageResult.fileName,
      } as any);

      // Add metadata
      formData.append('metadata', JSON.stringify({
        fileSize: imageResult.fileSize,
        dimensions: {
          width: imageResult.width,
          height: imageResult.height,
        },
        uploadedAt: new Date().toISOString(),
      }));

      const response = await api.post('/receipts/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout for uploads
      });

      return {
        success: true,
        transactionId: response.data.transactionId,
        processingId: response.data.processingId,
        message: response.data.message || 'Receipt uploaded successfully',
      };
    } catch (error: any) {
      console.error('Receipt upload error:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 
               error.message || 
               'Failed to upload receipt. Please try again.',
      };
    }
  }

  async getProcessingStatus(processingId: string): Promise<ReceiptProcessingStatus> {
    try {
      const response = await api.get(`/receipts/processing/${processingId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching processing status:', error);
      throw new Error(
        error.response?.data?.message || 
        'Failed to fetch processing status'
      );
    }
  }

  async pollProcessingStatus(
    processingId: string,
    onProgress: (status: ReceiptProcessingStatus) => void,
    maxAttempts: number = 30,
    interval: number = 2000
  ): Promise<ReceiptProcessingStatus> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const poll = async () => {
        try {
          attempts++;
          const status = await this.getProcessingStatus(processingId);
          
          onProgress(status);
          
          if (status.status === 'completed') {
            resolve(status);
            return;
          }
          
          if (status.status === 'failed') {
            reject(new Error(status.error || 'Receipt processing failed'));
            return;
          }
          
          if (attempts >= maxAttempts) {
            reject(new Error('Processing timeout - please try again'));
            return;
          }
          
          if (status.status === 'pending' || status.status === 'processing') {
            setTimeout(poll, interval);
          }
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(error);
          } else {
            setTimeout(poll, interval);
          }
        }
      };
      
      poll();
    });
  }

  async retryProcessing(processingId: string): Promise<ReceiptUploadResult> {
    try {
      const response = await api.post(`/receipts/retry/${processingId}`);
      
      return {
        success: true,
        processingId: response.data.processingId,
        message: response.data.message || 'Receipt processing restarted',
      };
    } catch (error: any) {
      console.error('Error retrying processing:', error);
      
      return {
        success: false,
        error: error.response?.data?.message || 
               'Failed to retry processing. Please try again.',
      };
    }
  }
}

export const receiptService = new ReceiptService();