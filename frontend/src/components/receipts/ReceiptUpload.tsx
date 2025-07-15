import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { transactionAPI } from '../../lib/api';

interface ReceiptUploadProps {
  transactionId: string;
  onUpload: (receiptUrl: string) => void;
  onDelete: () => void;
  currentReceiptUrl?: string;
}

export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  transactionId,
  onUpload,
  onDelete,
  currentReceiptUrl
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image (JPEG, PNG, WebP) or PDF file.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const response = await transactionAPI.uploadReceipt(transactionId, file);
      onUpload(response.data.receipt_url);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload receipt');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    try {
      await transactionAPI.deleteReceipt(transactionId);
      onDelete();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete receipt');
    }
  };

  const getFileIcon = (url: string) => {
    if (url.endsWith('.pdf')) {
      return <FileText className="w-4 h-4" />;
    }
    return <Image className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {currentReceiptUrl ? (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(currentReceiptUrl)}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Receipt uploaded
                </p>
                <a
                  href={`http://localhost:3000${currentReceiptUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  View receipt
                </a>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-500"
              title="Delete receipt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
          <div className="text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2">
              <label className="cursor-pointer">
                <span className="text-sm text-blue-600 hover:text-blue-500">
                  Upload receipt
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              JPEG, PNG, WebP, or PDF (max 10MB)
            </p>
          </div>
        </div>
      )}

      {isUploading && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Uploading receipt...</p>
        </div>
      )}
    </div>
  );
};