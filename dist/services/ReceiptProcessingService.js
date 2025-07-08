"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptProcessingService = void 0;
exports.setReceiptProgress = setReceiptProgress;
exports.getReceiptProgress = getReceiptProgress;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const DeepSeekService_1 = require("./DeepSeekService");
const redis_1 = require("../config/redis");
class ReceiptProcessingService {
    constructor() {
        this.deepSeekService = new DeepSeekService_1.DeepSeekService();
    }
    async createReceiptRecord(userId, filename, fileType, extractedText, parsedData) {
        console.log('🔍 [Database] Starting receipt record creation');
        console.log('🔍 [Database] Parameters:', {
            userId,
            filename,
            fileType,
            extractedTextLength: extractedText.length,
            parsedDataKeys: Object.keys(parsedData),
            confidence: parsedData.confidence
        });
        const client = await database_1.pool.connect();
        try {
            console.log('🔍 [Database] Database connection established');
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
            if (parsedData.items && Array.isArray(parsedData.items)) {
                console.log('🔍 [Per-Item Categorization] Starting per-item category suggestion for', parsedData.items.length, 'items');
                await Promise.all(parsedData.items.map(async (item, idx) => {
                    console.log(`🔍 [Per-Item Categorization] Suggesting category for item #${idx + 1}:`, item.name, item.amount);
                    try {
                        item.category = await this.deepSeekService.suggestCategoryForItem(item.name, item.amount);
                        console.log(`✅ [Per-Item Categorization] Category for item #${idx + 1} (${item.name}):`, item.category);
                    }
                    catch (err) {
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
                1024,
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
        }
        catch (error) {
            console.error('❌ [Database] Receipt record creation failed');
            console.error('❌ [Database] Error type:', error.constructor?.name);
            console.error('❌ [Database] Error message:', error.message);
            console.error('❌ [Database] Error code:', error.code);
            console.error('❌ [Database] Error detail:', error.detail);
            console.error('❌ [Database] Full error:', error);
            throw (0, errorHandler_1.createError)('Failed to create receipt record', 500);
        }
        finally {
            console.log('🔍 [Database] Releasing database connection');
            client.release();
        }
    }
    async getReceiptById(receiptId, userId) {
        const client = await database_1.pool.connect();
        try {
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
            console.log('🔍 [Database] Raw extracted_data:', receipt.extracted_data);
            console.log('🔍 [Database] Type of extracted_data:', typeof receipt.extracted_data);
            let extractedData;
            try {
                if (typeof receipt.extracted_data === 'string') {
                    extractedData = JSON.parse(receipt.extracted_data);
                }
                else {
                    extractedData = receipt.extracted_data;
                }
            }
            catch (parseError) {
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
        }
        catch (error) {
            console.error('Error retrieving receipt:', error);
            throw (0, errorHandler_1.createError)('Failed to retrieve receipt', 500);
        }
        finally {
            client.release();
        }
    }
    async createTransactionFromReceipt(receiptId, userId, confirmedData) {
        const client = await database_1.pool.connect();
        try {
            await client.query('BEGIN');
            const receiptQuery = `
        SELECT extracted_data FROM receipt_processing
        WHERE id = $1 AND user_id = $2
      `;
            const receiptResult = await client.query(receiptQuery, [receiptId, userId]);
            if (receiptResult.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Receipt not found', 404);
            }
            const categoryId = await this.getOrCreateCategory(client, userId, confirmedData.category || 'other');
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
                Math.abs(confirmedData.totalAmount),
                confirmedData.currency || 'USD',
                confirmedData.date || new Date().toISOString().split('T')[0],
                confirmedData.description || confirmedData.merchantName || 'Receipt transaction',
                'expense'
            ]);
            await client.query('UPDATE receipt_processing SET processing_status = $1, transaction_id = $2 WHERE id = $3', ['completed', transactionResult.rows[0].id, receiptId]);
            await client.query('COMMIT');
            return { id: transactionResult.rows[0].id };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw (0, errorHandler_1.createError)('Failed to create transaction from receipt', 500);
        }
        finally {
            client.release();
        }
    }
    async getOrCreateCategory(client, userId, categoryName) {
        const findQuery = `
      SELECT id FROM categories
      WHERE user_id = $1 AND LOWER(name) = LOWER($2)
    `;
        const findResult = await client.query(findQuery, [userId, categoryName]);
        if (findResult.rows.length > 0) {
            return findResult.rows[0].id;
        }
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
exports.ReceiptProcessingService = ReceiptProcessingService;
async function setReceiptProgress(jobId, progress, status = 'processing') {
    await redis_1.redisClient.hSet(`receipt:progress:${jobId}`, {
        progress: progress.toString(),
        status
    });
    await redis_1.redisClient.expire(`receipt:progress:${jobId}`, 3600);
}
async function getReceiptProgress(jobId) {
    const data = await redis_1.redisClient.hGetAll(`receipt:progress:${jobId}`);
    return {
        progress: data.progress ? parseInt(data.progress, 10) : 0,
        status: data.status || 'pending'
    };
}
//# sourceMappingURL=ReceiptProcessingService.js.map