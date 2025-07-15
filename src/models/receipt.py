from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import uuid


class ReceiptUpload(BaseModel):
    # This will be handled as form data in the API
    pass


class ReceiptProcessingResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    file_name: str
    file_size: int
    file_type: str
    processing_status: str  # pending, processing, completed, failed
    extracted_data: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    transaction_id: Optional[uuid.UUID] = None
    
    class Config:
        from_attributes = True


class ReceiptItem(BaseModel):
    name: str
    amount: float
    quantity: int = 1
    category: Optional[str] = None


class ParsedReceiptData(BaseModel):
    merchant_name: str
    total_amount: float
    currency: str
    date: Optional[str] = None
    category: Optional[str] = None
    items: List[ReceiptItem] = []
    confidence: float