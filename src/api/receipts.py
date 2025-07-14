from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from src.models.receipt import ReceiptProcessingResponse
from src.services.receipt_processing_service import ReceiptProcessingService
from src.middleware.auth_middleware import get_current_user
from src.utils.logger import logger

router = APIRouter()


@router.post("/upload", response_model=dict)
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    """Upload and process receipt"""
    try:
        # Validate file type
        TESSERACT_SUPPORTED_TYPES = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/tiff',
            'image/bmp',
            'image/gif',
            'image/webp',
            'image/x-portable-anymap',
            'application/pdf',
        ]
        # Read file data
        file_data = await file.read()
        # Debug log
        logger.info(f"[RECEIPT UPLOAD] filename={file.filename}, content_type={file.content_type}, size={len(file_data)} bytes")
        if not file.content_type or file.content_type not in TESSERACT_SUPPORTED_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type. Please upload a JPEG, PNG, TIFF, BMP, GIF, WebP, PNM, or PDF."
            )
        # Validate file size (max 10MB)
        if len(file_data) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size too large. Maximum 10MB allowed."
            )
        receipt_service = ReceiptProcessingService()
        result = await receipt_service.process_receipt_upload(
            user_id=current_user,
            file_data=file_data,
            file_name=file.filename or "receipt.jpg",
            file_type=file.content_type or "image/jpeg"
        )
        return {
            "success": True,
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading receipt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process receipt"
        )


@router.get("/{processing_id}", response_model=dict)
async def get_receipt_status(
    processing_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get receipt processing status"""
    try:
        receipt_service = ReceiptProcessingService()
        status_data = await receipt_service.get_processing_status(current_user, processing_id)
        
        if not status_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt processing record not found"
            )
        
        return {
            "success": True,
            "data": status_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting receipt status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get receipt status"
        )


@router.put("/{processing_id}/confirm", response_model=dict)
async def confirm_receipt_data(
    processing_id: str,
    request: Request,
    current_user: str = Depends(get_current_user)
):
    """Confirm receipt data and create final transaction"""
    try:
        # Get request body
        body = await request.json()
        confirmed_data = body.get('confirmedData', {})
        
        receipt_service = ReceiptProcessingService()
        
        # Create transaction from confirmed data
        result = await receipt_service.create_transaction_from_confirmed_data(
            current_user, processing_id, confirmed_data
        )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming receipt data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm receipt data"
        )