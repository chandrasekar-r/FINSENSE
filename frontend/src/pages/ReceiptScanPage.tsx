import React, { useState, useCallback, useEffect } from 'react'
import { receiptAPI, ReceiptData, categoryAPI, Category } from '../lib/api'

interface ProcessedReceipt {
  id: string
  file: File
  fileName: string
  fileSize: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  receiptData?: ReceiptData
  confirmedData?: any
  error?: string
  progress?: number
}

const STORAGE_KEY = 'finsense-receipt-queue'

export const ReceiptScanPage: React.FC = () => {
  const [receipts, setReceipts] = useState<ProcessedReceipt[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, setCategories] = useState<Category[]>([])
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Load receipts from localStorage on component mount
  useEffect(() => {
    const savedReceipts = localStorage.getItem(STORAGE_KEY)
    if (savedReceipts) {
      try {
        const parsedReceipts = JSON.parse(savedReceipts)
        // Recreate File objects from saved data
        const receiptsWithFiles = parsedReceipts.map((receipt: any) => ({
          ...receipt,
          file: new File([], receipt.fileName, { type: 'image/jpeg' }) // Placeholder file
        }))
        setReceipts(receiptsWithFiles)
      } catch (error) {
        console.error('Failed to load saved receipts:', error)
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    
    // Load categories
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await categoryAPI.getCategories()
      setCategories(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch categories:', error)
    }
  }

  // Save receipts to localStorage whenever receipts change
  useEffect(() => {
    if (receipts.length > 0) {
      // Save without the File objects (they can't be serialized)
      const receiptsToSave = receipts.map(({ file, ...receipt }) => ({
        ...receipt,
        fileName: file.name,
        fileSize: file.size
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receiptsToSave))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [receipts])

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const validateFile = (file: File): string | null => {
    // Validate file type
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return 'Please upload an image (PNG, JPG) or PDF file'
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB'
    }

    return null
  }

  const addFilesToQueue = useCallback((files: File[]) => {
    const newReceipts: ProcessedReceipt[] = files.map(file => {
      const validationError = validateFile(file)
      return {
        id: `${Date.now()}-${Math.random()}`,
        file,
        fileName: file.name,
        fileSize: file.size,
        status: validationError ? 'error' : 'pending',
        error: validationError || undefined
      }
    })

    setReceipts(prev => [...prev, ...newReceipts])
    setError(null)
  }, [])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    addFilesToQueue(files)
    
    // Reset the input
    event.target.value = ''
  }, [addFilesToQueue])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      addFilesToQueue(files)
    }
  }, [addFilesToQueue])

  const processReceipt = async (receipt: ProcessedReceipt) => {
    try {
      if (receipt.file.size === 0) {
        setReceipts(prev => prev.map(r =>
          r.id === receipt.id
            ? { ...r, status: 'error', error: 'File no longer available. Please re-upload.' }
            : r
        ))
        return
      }

      setReceipts(prev => prev.map(r =>
        r.id === receipt.id
          ? { ...r, status: 'processing', progress: 0 }
          : r
      ))

      // Upload and get jobId
      const response = await receiptAPI.uploadReceipt(receipt.file)
      const jobId = response.data.jobId

      // Poll backend for progress
      let isDone = false
      while (!isDone) {
        // eslint-disable-next-line no-await-in-loop
        const progressRes = await receiptAPI.getProgress(jobId)
        const { progress, status } = progressRes.data
        setReceipts(prev => prev.map(r =>
          r.id === receipt.id ? { ...r, progress } : r
        ))
        if (status === 'completed' || status === 'error') {
          isDone = true
        } else {
          // Wait 250ms before next poll for better progress visibility
          // eslint-disable-next-line no-await-in-loop
          await new Promise(res => setTimeout(res, 250))
        }
      }

      // Get the final processed data
      const finalData = await receiptAPI.getReceiptData(response.data.data.receiptId)

      // Update with completed data
      setReceipts(prev => prev.map(r =>
        r.id === receipt.id
          ? {
              ...r,
              status: 'completed',
              receiptData: finalData.data.data,
              confirmedData: finalData.data.data.parsed_data,
              progress: 100
            }
          : r
      ))
    } catch (error: any) {
      setReceipts(prev => prev.map(r =>
        r.id === receipt.id
          ? {
              ...r,
              status: 'error',
              error: error.response?.data?.message || 'Failed to process receipt'
            }
          : r
      ))
    }
  }

  const processAllReceipts = useCallback(async () => {
    const pendingReceipts = receipts.filter(r => r.status === 'pending')
    if (pendingReceipts.length === 0) return

    setIsProcessing(true)
    
    // Process receipts sequentially to avoid overwhelming the server
    for (const receipt of pendingReceipts) {
      await processReceipt(receipt)
    }
    
    setIsProcessing(false)
  }, [receipts])

  const removeReceipt = useCallback((id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id))
  }, [])

  const updateConfirmedData = useCallback((id: string, data: any) => {
    setReceipts(prev => prev.map(r => 
      r.id === id 
        ? { ...r, confirmedData: data }
        : r
    ))
  }, [])

  const createTransaction = useCallback(async (receipt: ProcessedReceipt) => {
    if (!receipt.receiptData || !receipt.confirmedData) return

    try {
      await receiptAPI.confirmReceiptData(receipt.receiptData.id, receipt.confirmedData)
      
      // Remove the receipt from the list after successful transaction creation
      removeReceipt(receipt.id)
      
      setNotification({ message: 'Transaction created successfully!', type: 'success' })
    } catch (error: any) {
      setNotification({ message: error.response?.data?.message || 'Failed to create transaction', type: 'error' })
    }
  }, [removeReceipt])

  const clearAll = useCallback(() => {
    setReceipts([])
    setError(null)
  }, [])

  const pendingCount = receipts.filter(r => r.status === 'pending').length
  const processingCount = receipts.filter(r => r.status === 'processing').length
  const completedCount = receipts.filter(r => r.status === 'completed').length
  const errorCount = receipts.filter(r => r.status === 'error').length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scan Receipts</h1>
          <p className="text-gray-600 dark:text-gray-400">Upload multiple receipts to automatically extract transaction data</p>
        </div>
        
        {receipts.length > 0 && (
          <div className="flex space-x-2">
            {pendingCount > 0 && (
              <button
                onClick={processAllReceipts}
                disabled={isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processing...' : `Process ${pendingCount} Receipt${pendingCount > 1 ? 's' : ''}`}
              </button>
            )}
            <button
              onClick={clearAll}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg border border-gray-200 dark:border-gray-700">
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                Drop receipts here or click to upload
              </span>
              <span className="mt-2 block text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, or PDF up to 10MB each • Multiple files supported
              </span>
            </label>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              multiple
              className="sr-only"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </div>
        </div>
      </div>

      {/* Restored Queue Notice */}
      {receipts.length > 0 && receipts.some(r => r.file.size === 0) && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.876c1.148 0 2.062-.929 2.062-2.077v-8.846C21 6.929 20.085 6 18.938 6H5.062C3.915 6 3 6.929 3 8.077v8.846C3 18.071 3.915 19 5.062 19z" />
            </svg>
            <p className="text-amber-700 dark:text-amber-300">
              Queue restored from previous session. Some files may need to be re-uploaded to process.
            </p>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {receipts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{processingCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{errorCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Errors</div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Queue */}
      {receipts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Receipt Queue</h2>
          
          {receipts.map((receipt) => (
            <div key={receipt.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {receipt.status === 'pending' && (
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    )}
                    {receipt.status === 'processing' && (
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    )}
                    {receipt.status === 'completed' && (
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    )}
                    {receipt.status === 'error' && (
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">{receipt.fileName}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(receipt.fileSize / 1024 / 1024).toFixed(2)} MB • {receipt.status}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeReceipt(receipt.id)}
                  className="text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {receipt.status === 'error' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <p className="text-red-600 dark:text-red-400 text-sm">{receipt.error}</p>
                    {receipt.file.size === 0 && (
                      <label className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 cursor-pointer">
                        Re-upload
                        <input
                          type="file"
                          className="sr-only"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setReceipts(prev => prev.map(r => 
                                r.id === receipt.id 
                                  ? { ...r, file, fileName: file.name, fileSize: file.size, status: 'pending', error: undefined }
                                  : r
                              ))
                            }
                            e.target.value = ''
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {receipt.status === 'processing' && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>Processing...</span>
                    <span>{receipt.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${receipt.progress || 0}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {receipt.status === 'completed' && receipt.receiptData && (
                <div className="space-y-4">
                  {/* Parsed Data Summary */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Merchant:</span>
                        <p className="text-gray-600 dark:text-gray-300">{receipt.receiptData.parsed_data.merchantName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Amount:</span>
                        <p className="text-gray-600 dark:text-gray-300">{receipt.receiptData.parsed_data.currency} {receipt.receiptData.parsed_data.totalAmount}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Date:</span>
                        <p className="text-gray-600 dark:text-gray-300">{receipt.receiptData.parsed_data.date}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">Category:</span>
                        <p className="text-gray-600 dark:text-gray-300 capitalize">{receipt.receiptData.parsed_data.category}</p>
                      </div>
                    </div>
                  </div>

                  {/* Per-Item Categorization Table */}
                  {receipt.receiptData && Array.isArray(receipt.receiptData.parsed_data.items) && receipt.receiptData.parsed_data.items.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Itemized Details</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr>
                              <th className="px-2 py-1 text-left">Item</th>
                              <th className="px-2 py-1 text-left">Amount</th>
                              <th className="px-2 py-1 text-left">Category</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receipt.receiptData.parsed_data.items.map((item, idx) => (
                              <tr key={idx}>
                                <td className="px-2 py-1">{item.name}</td>
                                <td className="px-2 py-1">{item.amount}</td>
                                <td className="px-2 py-1">
                                  <input
                                    type="text"
                                    value={receipt.confirmedData?.items?.[idx]?.category || item.category || ''}
                                    onChange={e => {
                                      const updatedItems = [...(receipt.confirmedData?.items || receipt.receiptData!.parsed_data.items)];
                                      updatedItems[idx] = {
                                        ...updatedItems[idx],
                                        category: e.target.value
                                      };
                                      updateConfirmedData(receipt.id, {
                                        ...receipt.confirmedData,
                                        items: updatedItems
                                      });
                                    }}
                                    className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Category"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Quick Edit Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Merchant Name
                      </label>
                      <input
                        type="text"
                        value={receipt.confirmedData?.merchantName || ''}
                        onChange={(e) => updateConfirmedData(receipt.id, {
                          ...receipt.confirmedData,
                          merchantName: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={receipt.confirmedData?.totalAmount || ''}
                        onChange={(e) => updateConfirmedData(receipt.id, {
                          ...receipt.confirmedData,
                          totalAmount: parseFloat(e.target.value)
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={receipt.confirmedData?.category || ''}
                        onChange={(e) => updateConfirmedData(receipt.id, {
                          ...receipt.confirmedData,
                          category: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Enter category name"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => createTransaction(receipt)}
                      disabled={!receipt.confirmedData?.totalAmount || !receipt.confirmedData?.merchantName}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Create Transaction
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Notification Modal */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out transform scale-100 opacity-100">
          <div className={`rounded-lg p-4 shadow-lg max-w-sm ${
            notification.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <p className={`text-sm font-medium ${
                  notification.type === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {notification.message}
                </p>
              </div>
              <button
                onClick={() => setNotification(null)}
                className={`ml-2 ${
                  notification.type === 'success' 
                    ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' 
                    : 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
