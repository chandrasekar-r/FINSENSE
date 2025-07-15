from typing import Dict, Any, Optional, List
import uuid
import json
import asyncio
from datetime import datetime, date
from src.config.database import DatabaseManager
from src.services.ocr_service import OCRService
from src.ai.deepseek_service import DeepSeekService
from src.services.transaction_service import TransactionService
from src.services.category_service import CategoryService
from src.models.receipt import ParsedReceiptData, ReceiptItem
from src.models.transaction import TransactionCreate
from src.middleware.error_handler import create_error
from src.utils.logger import logger


class ReceiptProcessingService:
    """Service for processing receipt uploads and OCR"""
    
    def __init__(self):
        self.ocr_service = OCRService()
        self.deepseek_service = DeepSeekService()
        self.transaction_service = TransactionService()
        self.category_service = CategoryService()
    
    async def process_receipt_upload(
        self, 
        user_id: str, 
        file_data: bytes, 
        file_name: str, 
        file_type: str
    ) -> Dict[str, Any]:
        """Process uploaded receipt file using Node.js tesseract.js OCR"""
        try:
            # Create processing record
            processing_record = await self._create_processing_record(
                user_id, file_name, len(file_data), file_type
            )
            try:
                # Update status to processing with 10% progress
                await self._update_processing_status_with_progress(
                    processing_record["id"], "processing", 10, "Starting OCR text extraction..."
                )

                # Add a small delay to make progress visible
                import asyncio
                await asyncio.sleep(0.5)

                # Extract text with Node.js OCR (no preprocessing)
                extracted_text = await self.ocr_service.extract_text_from_image(file_data)

                if not extracted_text.strip():
                    raise create_error("No text could be extracted from the image", 422)

                # Update progress after OCR completion
                await self._update_processing_status_with_progress(
                    processing_record["id"], "processing", 40, "OCR completed, parsing receipt data..."
                )

                # Add delay to see progress
                await asyncio.sleep(0.5)

                # Parse receipt data with AI
                parsed_data = await self.deepseek_service.parse_receipt_data(extracted_text)

                # Update progress after AI parsing
                await self._update_processing_status_with_progress(
                    processing_record["id"], "processing", 70, "Receipt data parsed, creating categories..."
                )

                # Add delay to see progress
                await asyncio.sleep(0.5)

                # Confidence is not available from tesseract.js, set to None
                confidence = None
                parsed_data["confidence"] = confidence

                # Find or create category (but don't assign it to transaction yet)
                category = await self._find_or_create_category(
                    user_id, parsed_data.get("category", "other")
                )

                # Update progress before completion
                await self._update_processing_status_with_progress(
                    processing_record["id"], "processing", 90, "Finalizing receipt processing..."
                )

                # Final delay before completion
                await asyncio.sleep(0.5)

                # Update processing record with extracted data only (no transaction yet)
                await self._update_processing_record(
                    processing_record["id"],
                    status="completed",
                    extracted_data=parsed_data,
                    confidence_score=confidence,
                    transaction_id=None,  # No transaction created yet
                    progress_percentage=100,
                    progress_message="Receipt processing completed - ready for review"
                )

                logger.info(f"Receipt processed successfully: {processing_record['id']} - awaiting user confirmation")

                return {
                    "processing_id": processing_record["id"],
                    "status": "completed", 
                    "extracted_data": parsed_data,
                    "confidence": confidence
                }

            except Exception as e:
                # Update status to failed
                await self._update_processing_status(
                    processing_record["id"], "failed", str(e)
                )
                raise e

        except Exception as e:
            logger.error(f"Receipt processing failed: {e}")
            raise e
    
    async def get_processing_status(self, user_id: str, processing_id: str) -> Optional[Dict[str, Any]]:
        """Get receipt processing status"""
        try:
            # Convert string IDs to UUID objects
            processing_uuid = uuid.UUID(processing_id) if isinstance(processing_id, str) else processing_id
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            
            # Try to select with progress columns first
            async with DatabaseManager(user_id) as db:
                try:
                    query = """
                        SELECT id, user_id, file_name, file_size, file_type, processing_status,
                               extracted_data, confidence_score, created_at, updated_at, transaction_id,
                               progress_percentage, progress_message
                        FROM receipt_processing
                        WHERE id = $1 AND user_id = $2
                    """
                    record = await db.fetchrow(query, processing_uuid, user_uuid)
                    if record:
                        result = dict(record)
                        # Convert UUID objects to strings for JSON serialization
                        if 'id' in result:
                            result['id'] = str(result['id'])
                        if 'user_id' in result:
                            result['user_id'] = str(result['user_id'])
                        if 'transaction_id' in result and result['transaction_id']:
                            result['transaction_id'] = str(result['transaction_id'])
                        return result
                    return None
                except Exception as e:
                    logger.warning(f"Progress columns query failed, falling back: {e}")
                    # Fall back to basic query without progress columns
                    query = """
                        SELECT id, user_id, file_name, file_size, file_type, processing_status,
                               extracted_data, confidence_score, created_at, updated_at, transaction_id
                        FROM receipt_processing
                        WHERE id = $1 AND user_id = $2
                    """
                    record = await db.fetchrow(query, processing_uuid, user_uuid)
                    result = dict(record) if record else None
                    # Add default progress fields for backward compatibility
                    if result:
                        # Convert UUID objects to strings for JSON serialization
                        if 'id' in result:
                            result['id'] = str(result['id'])
                        if 'user_id' in result:
                            result['user_id'] = str(result['user_id'])
                        if 'transaction_id' in result and result['transaction_id']:
                            result['transaction_id'] = str(result['transaction_id'])
                        
                        status = result['processing_status']
                        if status == 'completed':
                            result['progress_percentage'] = 100
                            result['progress_message'] = 'Processing completed'
                        elif status == 'processing':
                            result['progress_percentage'] = 50  # Default for processing
                            result['progress_message'] = 'Processing in progress...'
                        elif status == 'pending':
                            result['progress_percentage'] = 0
                            result['progress_message'] = 'Waiting to start...'
                        else:
                            result['progress_percentage'] = 0
                            result['progress_message'] = status
                    return result
        
        except Exception as e:
            logger.error(f"Error getting processing status: {e}")
            raise create_error("Failed to get processing status", 500)

    async def get_active_processing_jobs(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all active receipt processing jobs for user"""
        try:
            # Convert string ID to UUID object
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
            
            async with DatabaseManager(user_id) as db:
                query = """
                    SELECT id, user_id, file_name, file_size, file_type, processing_status,
                           extracted_data, confidence_score, created_at, updated_at, transaction_id,
                           progress_percentage, progress_message
                    FROM receipt_processing
                    WHERE user_id = $1 
                    AND processing_status IN ('pending', 'processing')
                    ORDER BY created_at DESC
                """
                
                rows = await db.fetch(query, user_uuid)
                results = []
                for row in rows:
                    result = dict(row)
                    # Convert UUID objects to strings for JSON serialization
                    if 'id' in result:
                        result['id'] = str(result['id'])
                    if 'user_id' in result:
                        result['user_id'] = str(result['user_id'])
                    if 'transaction_id' in result and result['transaction_id']:
                        result['transaction_id'] = str(result['transaction_id'])
                    results.append(result)
                return results
        
        except Exception as e:
            logger.error(f"Error getting active processing jobs: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return []
    
    async def create_async_processing_record(
        self, 
        user_id: str, 
        file_data: bytes, 
        file_name: str, 
        file_type: str
    ) -> Dict[str, Any]:
        """Create processing record and start async processing"""
        try:
            import asyncio
            
            # Create initial processing record
            query = """
                INSERT INTO receipt_processing (user_id, file_name, file_size, file_type, processing_status, progress_percentage, progress_message)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, user_id, file_name, file_size, file_type, processing_status, created_at
            """
            
            async with DatabaseManager(user_id) as db:
                record = await db.fetchrow(
                    query,
                    uuid.UUID(user_id),
                    file_name,
                    len(file_data),
                    file_type,
                    "pending",
                    0,
                    "Uploading receipt..."
                )
                processing_record = dict(record)
                # Convert UUID objects to strings for JSON serialization
                if 'id' in processing_record:
                    processing_record['id'] = str(processing_record['id'])
                if 'user_id' in processing_record:
                    processing_record['user_id'] = str(processing_record['user_id'])
            
            # Start async processing in the background
            asyncio.create_task(self._process_receipt_async(
                user_id=user_id,
                processing_id=processing_record["id"],
                file_data=file_data,
                file_name=file_name,
                file_type=file_type
            ))
            
            return processing_record
        
        except Exception as e:
            logger.error(f"Error creating async processing record: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise create_error("Failed to create processing record", 500)

    async def _process_receipt_async(
        self, 
        user_id: str, 
        processing_id: str, 
        file_data: bytes, 
        file_name: str, 
        file_type: str
    ) -> None:
        """Process receipt asynchronously"""
        try:
            # Convert processing_id to UUID object if it's a string
            processing_uuid = uuid.UUID(processing_id) if isinstance(processing_id, str) else processing_id
            
            # Update status to processing
            await self._update_processing_status_with_progress(
                processing_uuid, "processing", 5, "Starting OCR text extraction..."
            )
            
            # Add a small delay to make progress visible
            await asyncio.sleep(0.5)
            
            # Extract text with Node.js OCR (no preprocessing)
            extracted_text = await self.ocr_service.extract_text_from_image(file_data)
            
            if not extracted_text.strip():
                await self._update_processing_status(
                    processing_uuid, "failed", "No text could be extracted from the image"
                )
                return
            
            # Update progress after OCR completion
            await self._update_processing_status_with_progress(
                processing_uuid, "processing", 35, "OCR completed, parsing receipt data..."
            )
            
            # Add delay to see progress
            await asyncio.sleep(0.5)
            
            # Parse receipt data with AI
            parsed_data = await self.deepseek_service.parse_receipt_data(extracted_text)
            
            # Update progress after AI parsing
            await self._update_processing_status_with_progress(
                processing_uuid, "processing", 65, "Receipt data parsed, creating categories..."
            )
            
            # Add delay to see progress
            await asyncio.sleep(0.5)
            
            # Find or create category (but don't assign it to transaction yet)
            category = await self._find_or_create_category(
                user_id, parsed_data.get("category", "other")
            )
            
            # Update progress before completion
            await self._update_processing_status_with_progress(
                processing_uuid, "processing", 85, "Finalizing receipt processing..."
            )
            
            # Final delay before completion
            await asyncio.sleep(0.5)
            
            # Update processing record with extracted data only (no transaction yet)
            await self._update_processing_record(
                processing_uuid,
                status="completed",
                extracted_data=parsed_data,
                confidence_score=None,
                transaction_id=None,
                progress_percentage=100,
                progress_message="Receipt processing completed - ready for review"
            )
            
            logger.info(f"Receipt processed successfully: {processing_id} - awaiting user confirmation")
            
        except Exception as e:
            logger.error(f"Async receipt processing failed for {processing_id}: {e}")
            # Convert processing_id to UUID object if it's a string
            processing_uuid = uuid.UUID(processing_id) if isinstance(processing_id, str) else processing_id
            await self._update_processing_status(
                processing_uuid, "failed", str(e)
            )

    async def _create_processing_record(
        self, 
        user_id: str, 
        file_name: str, 
        file_size: int, 
        file_type: str
    ) -> Dict[str, Any]:
        """Create initial processing record"""
        try:
            query = """
                INSERT INTO receipt_processing (user_id, file_name, file_size, file_type, processing_status)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, user_id, file_name, file_size, file_type, processing_status, created_at
            """
            
            async with DatabaseManager(user_id) as db:
                record = await db.fetchrow(
                    query,
                    uuid.UUID(user_id),
                    file_name,
                    file_size,
                    file_type,
                    "pending"
                )
                
                return dict(record)
        
        except Exception as e:
            logger.error(f"Error creating processing record: {e}")
            raise create_error("Failed to create processing record", 500)
    
    async def _update_processing_status(
        self, 
        processing_id: uuid.UUID, 
        status: str, 
        error_message: Optional[str] = None
    ) -> None:
        """Update processing status"""
        try:
            # Ensure processing_id is a UUID object
            processing_uuid = uuid.UUID(str(processing_id)) if not isinstance(processing_id, uuid.UUID) else processing_id
            
            if error_message:
                query = """
                    UPDATE receipt_processing
                    SET processing_status = $1, updated_at = CURRENT_TIMESTAMP,
                        extracted_data = $2
                    WHERE id = $3
                """
                error_data = {"error": error_message}
                
                # Use a generic user context for this update
                async with DatabaseManager() as db:
                    await db.execute(query, status, json.dumps(error_data), processing_uuid)
            else:
                query = """
                    UPDATE receipt_processing
                    SET processing_status = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                """
                
                async with DatabaseManager() as db:
                    await db.execute(query, status, processing_uuid)
        
        except Exception as e:
            logger.error(f"Error updating processing status: {e}")
    
    async def _update_processing_status_with_progress(
        self, 
        processing_id: uuid.UUID, 
        status: str, 
        progress_percentage: int,
        progress_message: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> None:
        """Update processing status with progress information"""
        try:
            # Ensure processing_id is a UUID object
            processing_uuid = uuid.UUID(str(processing_id)) if not isinstance(processing_id, uuid.UUID) else processing_id
            
            logger.info(f"Updating progress: {processing_uuid} -> {progress_percentage}% - {progress_message}")
            # Check if progress columns exist, if not add them dynamically
            async with DatabaseManager() as db:
                # First ensure progress columns exist
                try:
                    await db.execute("ALTER TABLE receipt_processing ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0")
                    await db.execute("ALTER TABLE receipt_processing ADD COLUMN IF NOT EXISTS progress_message TEXT")
                    logger.info("Progress columns ensured in receipt_processing table")
                except Exception as e:
                    logger.warning(f"Could not add progress columns: {e}")
                
                # Now try to update with progress columns
                try:
                    query = """
                        UPDATE receipt_processing
                        SET processing_status = $1, 
                            progress_percentage = $2,
                            progress_message = $3,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $4
                    """
                    await db.execute(
                        query,
                        status,
                        progress_percentage,
                        progress_message,
                        processing_uuid
                    )
                    logger.info(f"Progress updated successfully: {progress_percentage}% - {progress_message}")
                except Exception as e:
                    # Fall back to basic status update
                    logger.warning(f"Could not update with progress, falling back to basic update: {e}")
                    await self._update_processing_status(processing_uuid, status, error_message)
        
        except Exception as e:
            logger.error(f"Error updating processing status with progress: {e}")
    
    async def _update_processing_record(
        self,
        processing_id: uuid.UUID,
        status: str,
        extracted_data: Optional[Dict[str, Any]] = None,
        confidence_score: Optional[float] = None,
        transaction_id: Optional[uuid.UUID] = None,
        progress_percentage: Optional[int] = None,
        progress_message: Optional[str] = None
    ) -> None:
        """Update processing record with results"""
        try:
            # Try to update with progress columns first
            async with DatabaseManager() as db:
                try:
                    query = """
                        UPDATE receipt_processing
                        SET processing_status = $1, extracted_data = $2, confidence_score = $3,
                            transaction_id = $4, progress_percentage = $5, progress_message = $6,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $7
                    """
                    # Ensure processing_id is a UUID object
                    processing_uuid = uuid.UUID(str(processing_id)) if not isinstance(processing_id, uuid.UUID) else processing_id
                    
                    # Ensure transaction_id is a UUID object if provided
                    transaction_uuid = None
                    if transaction_id:
                        transaction_uuid = uuid.UUID(str(transaction_id)) if not isinstance(transaction_id, uuid.UUID) else transaction_id

                    await db.execute(
                        query,
                        status,
                        json.dumps(extracted_data) if extracted_data else None,
                        confidence_score,
                        transaction_uuid,
                        progress_percentage,
                        progress_message,
                        processing_uuid
                    )
                except Exception:
                    # Fall back to basic update without progress columns
                    query = """
                        UPDATE receipt_processing
                        SET processing_status = $1, extracted_data = $2, confidence_score = $3,
                            transaction_id = $4, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $5
                    """
                    
                    # Ensure processing_id is a UUID object
                    processing_uuid = uuid.UUID(str(processing_id)) if not isinstance(processing_id, uuid.UUID) else processing_id
                    
                    # Ensure transaction_id is a UUID object if provided
                    transaction_uuid = None
                    if transaction_id:
                        transaction_uuid = uuid.UUID(str(transaction_id)) if not isinstance(transaction_id, uuid.UUID) else transaction_id

                    await db.execute(
                        query,
                        status,
                        json.dumps(extracted_data) if extracted_data else None,
                        confidence_score,
                        transaction_uuid,
                        processing_uuid
                    )
        
        except Exception as e:
            logger.error(f"Error updating processing record: {e}")
    
    async def _find_or_create_category(self, user_id: str, category_name: str) -> Dict[str, Any]:
        """Find existing category or create new one"""
        try:
            # Try to find existing category
            categories = await self.category_service.get_user_categories(user_id)
            
            for category in categories:
                if category["name"].lower() == category_name.lower():
                    return category
            
            # Create new category if not found
            from src.models.category import CategoryCreate
            
            category_data = CategoryCreate(
                name=category_name.title(),
                color="#6B7280",
                icon="receipt"
            )
            
            return await self.category_service.create_category(user_id, category_data)
        
        except Exception as e:
            logger.error(f"Error finding/creating category: {e}")
            # Return default category if creation fails
            categories = await self.category_service.get_user_categories(user_id)
            return categories[0] if categories else {"id": uuid.uuid4()}
    
    async def _create_transaction_from_receipt(
        self, 
        user_id: str, 
        parsed_data: Dict[str, Any], 
        category_id: uuid.UUID
    ) -> Dict[str, Any]:
        """Create transaction from parsed receipt data"""
        try:
            # Parse date
            transaction_date = date.today()
            if parsed_data.get("date"):
                try:
                    transaction_date = datetime.strptime(parsed_data["date"], "%Y-%m-%d").date()
                except:
                    pass  # Use today's date if parsing fails
            
            transaction_data = TransactionCreate(
                vendor_name=parsed_data.get("merchantName", "Unknown Merchant"),
                amount=float(parsed_data.get("totalAmount", 0)),
                currency=parsed_data.get("currency", "USD"),
                transaction_date=transaction_date,
                description=f"Receipt from {parsed_data.get('merchantName', 'Unknown Merchant')}",
                transaction_type="expense",
                category_id=category_id
            )
            
            return await self.transaction_service.create_transaction(user_id, transaction_data)
        
        except Exception as e:
            logger.error(f"Error creating transaction from receipt: {e}")
            raise create_error("Failed to create transaction from receipt", 500)
    
    async def _save_receipt_items(self, transaction_id: uuid.UUID, items: List[Dict[str, Any]]) -> None:
        """Save individual receipt items"""
        try:
            if not items:
                return
            
            query = """
                INSERT INTO transaction_line_items (transaction_id, item_name, quantity, unit_price, total_price)
                VALUES ($1, $2, $3, $4, $5)
            """
            
            # Use a generic database manager for this operation
            async with DatabaseManager() as db:
                for item in items:
                    await db.execute(
                        query,
                        transaction_id,
                        item.get("name", "Unknown Item"),
                        item.get("quantity", 1),
                        float(item.get("amount", 0)),
                        float(item.get("amount", 0)) * item.get("quantity", 1)
                    )
            
            logger.info(f"Saved {len(items)} receipt items for transaction {transaction_id}")
        
        except Exception as e:
            logger.error(f"Error saving receipt items: {e}")
            # Don't raise error as this is not critical for transaction creation
    
    async def create_transaction_from_confirmed_data(
        self, 
        user_id: str, 
        processing_id: str, 
        confirmed_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create transaction from user-confirmed receipt data"""
        try:
            # Get processing record
            status_data = await self.get_processing_status(user_id, processing_id)
            
            if not status_data:
                raise create_error("Receipt processing record not found", 404)
            
            if status_data.get('processing_status') != 'completed':
                raise create_error("Receipt processing not completed yet", 400)
            
            if status_data.get('transaction_id'):
                # Transaction already exists, return it
                transaction = await self.transaction_service.get_transaction(
                    user_id, str(status_data['transaction_id'])
                )
                return {
                    "success": True,
                    "message": "Transaction already created",
                    "transaction_id": str(status_data['transaction_id']),
                    "transaction": transaction
                }
            
            # Use confirmed data for transaction creation
            merchant_name = confirmed_data.get('merchantName', confirmed_data.get('merchant_name', 'Unknown Merchant'))
            total_amount = confirmed_data.get('totalAmount', confirmed_data.get('total_amount', 0))
            currency = confirmed_data.get('currency', 'USD')
            receipt_date = confirmed_data.get('date', str(date.today()))
            category_name = confirmed_data.get('category', 'other')
            
            # Find or create category
            category = await self._find_or_create_category(user_id, category_name)
            
            # Parse date
            transaction_date = date.today()
            if receipt_date:
                try:
                    transaction_date = datetime.strptime(receipt_date, "%Y-%m-%d").date()
                except:
                    pass  # Use today's date if parsing fails
            
            # Create transaction using confirmed data
            transaction_data = TransactionCreate(
                vendor_name=merchant_name,
                amount=float(total_amount),
                currency=currency,
                transaction_date=transaction_date,
                description=f"Receipt from {merchant_name}",
                transaction_type="expense",
                category_id=category["id"]
            )
            
            transaction = await self.transaction_service.create_transaction(user_id, transaction_data)
            
            # Save line items if available
            items = confirmed_data.get('items', [])
            if items:
                await self._save_receipt_items(transaction["id"], items)
            
            # Update processing record with transaction ID
            await self._update_processing_record(
                uuid.UUID(processing_id),
                status="completed",
                extracted_data=confirmed_data,
                confidence_score=status_data.get('confidence_score'),
                transaction_id=transaction["id"]
            )
            
            logger.info(f"Transaction created from confirmed receipt data: {transaction['id']}")
            
            return {
                "success": True,
                "message": "Transaction created successfully",
                "transaction_id": str(transaction["id"]),
                "transaction": transaction
            }
        
        except Exception as e:
            logger.error(f"Error creating transaction from confirmed data: {e}")
            raise e