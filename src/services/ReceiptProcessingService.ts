import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { DeepSeekService } from './DeepSeekService';
import { redisClient } from '../config/redis';

interface ParsedReceiptData {
  merchantName?: string;
  totalAmount?: number;
  currency?: string;
  date?: string;
  category?: string;
  items?: Array<{
    name: string;
    amount: number;
    quantity?: number;
    category?: string;
  }>;
  confidence: number;
}

interface ReceiptRecord {
  id: string;
  user_id: string;
  filename: string;
  file_type: string;
  extracted_text: string;
  parsed_data: ParsedReceiptData;
  status: string;
  created_at: string;
}

export class ReceiptProcessingService {
  private deepSeekService = new DeepSeekService();

  async createReceiptRecord(
    userId: string,
    filename: string,
    fileType: string,
    extractedText: string,
    parsedData: ParsedReceiptData
  ): Promise<ReceiptRecord> {
    console.log('🔍 [Database] Starting receipt record creation');
    console.log('🔍 [Database] Parameters:', {
      userId,
      filename,
      fileType,
      extractedTextLength: extractedText.length,
      parsedDataKeys: Object.keys(parsedData),
      confidence: parsedData.confidence
    });
    
    const client = await pool.connect();
    try {
      console.log('🔍 [Database] Database connection established');
      
      // Set user context for Row Level Security
      console.log('🔍 [Database] Setting user context for RLS...');
      await client.query(`SET app.current_user_id = '${userId}'`);
      console.log('✅ [Database] User context set successfully');
      
      const dataToStore = {
        extractedText,
        parsedData
      };
      
      console.log('🔍 [Database] Preparing data for storage:', {
        dataSize: JSON.stringify(dataToStore).length + ' characters',
        extractedTextLength: extractedText.length,
        parsedDataStructure: {
          merchantName: parsedData.merchantName,
          totalAmount: parsedData.totalAmount,
          currency: parsedData.currency,
          itemsCount: parsedData.items?.length || 0
        }
      });
      
      // Per-item categorization
      if (parsedData.items && Array.isArray(parsedData.items)) {
        console.log('🔍 [Per-Item Categorization] Starting per-item category suggestion for', parsedData.items.length, 'items');
        await Promise.all(parsedData.items.map(async (item, idx) => {
          console.log(`🔍 [Per-Item Categorization] Suggesting category for item #${idx + 1}:`, item.name, item.amount);
          try {
            item.category = await this.deepSeekService.suggestCategoryForItem(item.name, item.amount);
            console.log(`✅ [Per-Item Categorization] Category for item #${idx + 1} (${item.name}):`, item.category);
          } catch (err) {
            console.error(`❌ [Per-Item Categorization] Failed for item #${idx + 1} (${item.name}):`, err);
            item.category = 'other';
          }
        }));
        console.log('✅ [Per-Item Categorization] Completed per-item category suggestion');
      }
      
      const query = `
        INSERT INTO receipt_processing (
          user_id, file_name, file_type, file_size, processing_status, 
          extracted_data, confidence_score
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      console.log('🔍 [Database] Executing INSERT query...');
      const queryParams = [
        userId,
        filename,
        fileType,
        1024, // Default file size - we don't have this info
        'completed',
        JSON.stringify(dataToStore),
        parsedData.confidence
      ];
      
      console.log('🔍 [Database] Query parameters:', {
        userId,
        filename,
        fileType,
        fileSize: 1024,
        status: 'completed',
        dataSize: JSON.stringify(dataToStore).length,
        confidence: parsedData.confidence
      });

      const result = await client.query(query, queryParams);
      
      console.log('✅ [Database] INSERT query executed successfully');
      console.log('🔍 [Database] Returned record ID:', result.rows[0]?.id);
      console.log('🔍 [Database] Returned record structure:', Object.keys(result.rows[0] || {}));

      return result.rows[0];
    } catch (error) {
      console.error('❌ [Database] Receipt record creation failed');
      console.error('❌ [Database] Error type:', (error as any).constructor?.name);
      console.error('❌ [Database] Error message:', (error as any).message);
      console.error('❌ [Database] Error code:', (error as any).code);
      console.error('❌ [Database] Error detail:', (error as any).detail);
      console.error('❌ [Database] Full error:', error);
      throw createError('Failed to create receipt record', 500);
    } finally {
      console.log('🔍 [Database] Releasing database connection');
      client.release();
    }
  }

  async getReceiptById(receiptId: string, userId: string): Promise<ReceiptRecord | null> {
    const client = await pool.connect();
    try {
      // Set user context for Row Level Security
      await client.query(`SET app.current_user_id = '${userId}'`);
      
      const query = `
        SELECT * FROM receipt_processing
        WHERE id = $1 AND user_id = $2
      `;

      const result = await client.query(query, [receiptId, userId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const receipt = result.rows[0];
      // Parse the JSON data from extracted_data column
      console.log('🔍 [Database] Raw extracted_data:', receipt.extracted_data);
      console.log('🔍 [Database] Type of extracted_data:', typeof receipt.extracted_data);
      
      let extractedData;
      try {
        // Handle case where extracted_data might already be an object or needs parsing
        if (typeof receipt.extracted_data === 'string') {
          extractedData = JSON.parse(receipt.extracted_data);
        } else {
          extractedData = receipt.extracted_data;
        }
      } catch (parseError) {
        console.error('🔍 [Database] JSON parsing error:', parseError);
        console.error('🔍 [Database] Raw data that failed to parse:', receipt.extracted_data);
        throw parseError;
      }
      
      return {
        id: receipt.id,
        user_id: receipt.user_id,
        filename: receipt.file_name,
        file_type: receipt.file_type,
        extracted_text: extractedData.extractedText,
        parsed_data: extractedData.parsedData,
        status: receipt.processing_status,
        created_at: receipt.created_at
      };
    } catch (error) {
      console.error('Error retrieving receipt:', error);
      throw createError('Failed to retrieve receipt', 500);
    } finally {
      client.release();
    }
  }

  async createTransactionFromReceipt(
    receiptId: string,
    userId: string,
    confirmedData: any
  ): Promise<{ id: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get receipt data
      const receiptQuery = `
        SELECT extracted_data FROM receipt_processing
        WHERE id = $1 AND user_id = $2
      `;
      const receiptResult = await client.query(receiptQuery, [receiptId, userId]);
      
      if (receiptResult.rows.length === 0) {
        throw createError('Receipt not found', 404);
      }

      // Get or create category
      const categoryId = await this.getOrCreateCategory(
        client,
        userId,
        confirmedData.category || 'other'
      );

      // Create transaction - match the actual schema
      const transactionQuery = `
        INSERT INTO transactions (
          user_id, category_id, vendor_name, amount, currency, transaction_date, description, transaction_type
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `;

      const transactionResult = await client.query(transactionQuery, [
        userId,
        categoryId,
        confirmedData.merchantName || 'Unknown Merchant',
        Math.abs(confirmedData.totalAmount), // Positive amount as per schema
        confirmedData.currency || 'USD',
        confirmedData.date || new Date().toISOString().split('T')[0],
        confirmedData.description || confirmedData.merchantName || 'Receipt transaction',
        'expense' // Receipts are always expenses
      ]);

      // Update receipt status
      await client.query(
        'UPDATE receipt_processing SET processing_status = $1, transaction_id = $2 WHERE id = $3',
        ['completed', transactionResult.rows[0].id, receiptId]
      );

      await client.query('COMMIT');

      return { id: transactionResult.rows[0].id };
    } catch (error) {
      await client.query('ROLLBACK');
      throw createError('Failed to create transaction from receipt', 500);
    } finally {
      client.release();
    }
  }

  private async getOrCreateCategory(client: any, userId: string, categoryName: string): Promise<string> {
    // Try to find existing category
    const findQuery = `
      SELECT id FROM categories
      WHERE user_id = $1 AND LOWER(name) = LOWER($2)
    `;
    const findResult = await client.query(findQuery, [userId, categoryName]);

    if (findResult.rows.length > 0) {
      return findResult.rows[0].id;
    }

    // Create new category
    const categoryColors = ['#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];
    const randomColor = categoryColors[Math.floor(Math.random() * categoryColors.length)];

    const createQuery = `
      INSERT INTO categories (user_id, name, color, icon, is_default)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const createResult = await client.query(createQuery, [
      userId,
      categoryName,
      randomColor,
      'folder',
      false
    ]);

    return createResult.rows[0].id;
  }
}

export async function setReceiptProgress(jobId: string, progress: number, status: string = 'processing') {
  await redisClient.hSet(`receipt:progress:${jobId}`, {
    progress: progress.toString(),
    status
  });
  // Set an expiry so old jobs are cleaned up
  await redisClient.expire(`receipt:progress:${jobId}`, 3600);
}

export async function getReceiptProgress(jobId: string) {
  const data = await redisClient.hGetAll(`receipt:progress:${jobId}`);
  return {
    progress: data.progress ? parseInt(data.progress, 10) : 0,
    status: data.status || 'pending'
  };
}