from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Union, Dict, Any
from pydantic import BaseModel, Field, field_validator
import uuid


class TransactionBase(BaseModel):
    vendor_name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    tax_amount: Optional[Decimal] = Field(default=0, ge=0)
    currency: str = Field(..., max_length=3)
    transaction_date: datetime
    description: Optional[str] = None
    transaction_type: str = Field(default="expense", pattern="^(income|expense)$")


class TransactionCreate(TransactionBase):
    category_id: uuid.UUID


class TransactionUpdate(BaseModel):
    vendor_name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0)
    tax_amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    transaction_date: Optional[datetime] = None
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    transaction_type: Optional[str] = Field(None, pattern="^(income|expense)$")


class TransactionResponse(TransactionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    category_name: Optional[str] = None
    receipt_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    receipt_details: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True


class TransactionLineItemBase(BaseModel):
    item_name: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(default=1, gt=0)
    unit_price: Decimal = Field(..., ge=0)
    total_price: Decimal = Field(..., ge=0)


class TransactionLineItemCreate(TransactionLineItemBase):
    pass


class TransactionLineItemResponse(TransactionLineItemBase):
    id: uuid.UUID
    transaction_id: uuid.UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class TransactionWithItems(TransactionResponse):
    items: List[TransactionLineItemResponse] = []


class TransactionFilter(BaseModel):
    category_id: Optional[uuid.UUID] = None
    transaction_type: Optional[str] = Field(None, pattern="^(income|expense)$")
    start_date: Optional[Union[datetime, date, str]] = None
    end_date: Optional[Union[datetime, date, str]] = None
    min_amount: Optional[Decimal] = Field(None, ge=0)
    max_amount: Optional[Decimal] = Field(None, ge=0)
    vendor_name: Optional[str] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=10, ge=1, le=100)
    
    @field_validator('page', 'limit', mode='before')
    def parse_int(cls, v):
        if v is None:
            return None  # Let default handle it
        if isinstance(v, int):
            return v
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                raise ValueError(f"Invalid integer value: {v}")
        return v
    
    @field_validator('start_date', 'end_date', mode='before')
    def parse_date(cls, v):
        if v is None:
            return v
        if isinstance(v, (datetime, date)):
            return v
        if isinstance(v, str):
            # Try to parse as date-only first (YYYY-MM-DD)
            try:
                parsed_date = datetime.strptime(v, '%Y-%m-%d')
                return parsed_date
            except ValueError:
                # Try to parse as datetime if that fails
                try:
                    return datetime.fromisoformat(v)
                except ValueError:
                    raise ValueError(f"Invalid date format: {v}. Expected YYYY-MM-DD or ISO datetime format.")
        return v


class SpendingSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    net_amount: Decimal
    transaction_count: int
    period: str


class CategorySummary(BaseModel):
    category_id: uuid.UUID
    category_name: str
    total_amount: Decimal
    transaction_count: int
    percentage: float


class PaginatedTransactionResponse(BaseModel):
    transactions: List[TransactionResponse]
    total: int
    page: int
    limit: int
    total_pages: int


class TransactionAPIResponse(BaseModel):
    success: bool
    data: PaginatedTransactionResponse