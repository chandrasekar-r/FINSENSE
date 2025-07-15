"""File upload endpoints for receipts and other documents."""

import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from src.middleware.auth_middleware import get_current_user
from src.config.database import DatabaseManager
from src.utils.logger import logger

router = APIRouter(prefix="/upload", tags=["upload"])

# Ensure upload directory exists
UPLOAD_DIR = "/Users/rc/Documents/RCLABS/FINSENSE/uploads/receipts"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.pdf', '.webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {
        ext.lstrip('.') for ext in ALLOWED_EXTENSIONS
    }


@router.post("/receipt/{transaction_id}")
async def upload_receipt(
    transaction_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a receipt file for a transaction."""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content to check size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}_{transaction_id}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Update transaction with receipt URL
        receipt_url = f"/uploads/receipts/{unique_filename}"
        
        async with DatabaseManager(current_user["id"]) as db:
            update_query = """
                UPDATE transactions 
                SET receipt_url = $1, updated_at = NOW()
                WHERE id = $2 AND user_id = $3
                RETURNING id
            """
            result = await db.fetchrow(
                update_query, 
                receipt_url, 
                uuid.UUID(transaction_id), 
                uuid.UUID(current_user["id"])
            )
            
            if not result:
                # Clean up file if transaction doesn't exist
                os.remove(file_path)
                raise HTTPException(status_code=404, detail="Transaction not found")
        
        logger.info(f"Receipt uploaded for transaction {transaction_id}: {unique_filename}")
        
        return {
            "success": True,
            "receipt_url": receipt_url,
            "filename": unique_filename,
            "transaction_id": transaction_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading receipt: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload receipt")


@router.get("/receipt/{filename}")
async def get_receipt(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a receipt file."""
    try:
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Receipt not found")
        
        # Validate user owns this receipt by checking transaction ownership
        async with DatabaseManager(current_user["id"]) as db:
            query = """
                SELECT t.id
                FROM transactions t
                WHERE t.receipt_url = $1 AND t.user_id = $2
            """
            result = await db.fetchrow(query, f"/uploads/receipts/{filename}", uuid.UUID(current_user["id"]))
            
            if not result:
                raise HTTPException(status_code=403, detail="Access denied")
        
        return FileResponse(file_path)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving receipt: {e}")
        raise HTTPException(status_code=500, detail="Failed to serve receipt")


@router.delete("/receipt/{transaction_id}")
async def delete_receipt(
    transaction_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a receipt file for a transaction."""
    try:
        async with DatabaseManager(current_user["id"]) as db:
            # Get current receipt URL
            query = """
                SELECT receipt_url
                FROM transactions
                WHERE id = $1 AND user_id = $2
            """
            result = await db.fetchrow(query, uuid.UUID(transaction_id), uuid.UUID(current_user["id"]))
            
            if not result:
                raise HTTPException(status_code=404, detail="Transaction not found")
            
            receipt_url = result["receipt_url"]
            if not receipt_url:
                raise HTTPException(status_code=404, detail="No receipt to delete")
            
            # Delete file
            filename = receipt_url.split("/")[-1]
            file_path = os.path.join(UPLOAD_DIR, filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Update transaction
            update_query = """
                UPDATE transactions 
                SET receipt_url = NULL, updated_at = NOW()
                WHERE id = $1 AND user_id = $2
            """
            await db.execute(update_query, uuid.UUID(transaction_id), uuid.UUID(current_user["id"]))
        
        logger.info(f"Receipt deleted for transaction {transaction_id}")
        
        return {"success": True, "message": "Receipt deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting receipt: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete receipt")