"""Tool parameter schemas and response models."""

from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field, validator
from datetime import date
import uuid


class TransactionCreateParams(BaseModel):
    """Parameters for creating a new transaction."""
    amount: float = Field(..., description="Transaction amount (always positive)", gt=0)
    description: str = Field(..., description="Transaction description", min_length=1)
    category_id: str = Field(..., description="Category ID for the transaction")
    transaction_type: Literal["income", "expense"] = Field(..., description="Type of transaction")
    transaction_date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format (optional, defaults to today)")
    merchant_name: Optional[str] = Field(None, description="Merchant or vendor name (optional)")
    
    @validator('transaction_date')
    def validate_date(cls, v):
        if v is not None:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v


class TransactionUpdateParams(BaseModel):
    """Parameters for updating an existing transaction."""
    transaction_id: str = Field(..., description="ID of transaction to update")
    amount: Optional[float] = Field(None, description="New amount", gt=0)
    description: Optional[str] = Field(None, description="New description", min_length=1)
    category_id: Optional[str] = Field(None, description="New category ID")
    transaction_type: Optional[Literal["income", "expense"]] = Field(None, description="New transaction type")
    merchant_name: Optional[str] = Field(None, description="New merchant name")


class TransactionFilterParams(BaseModel):
    """Parameters for filtering transactions."""
    category: Optional[str] = Field(None, description="Filter by category name")
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    transaction_type: Optional[Literal["income", "expense"]] = Field(None, description="Filter by transaction type")
    merchant: Optional[str] = Field(None, description="Filter by merchant name")
    limit: Optional[int] = Field(10, description="Number of transactions to return", ge=1, le=100)


class BudgetCreateParams(BaseModel):
    """Parameters for creating a new budget."""
    category_id: str = Field(..., description="Category ID for the budget")
    name: str = Field(..., description="Budget name", min_length=1)
    amount: float = Field(..., description="Budget amount", gt=0)
    currency: Optional[str] = Field("USD", description="Currency code (e.g., USD, EUR)")
    period_type: Literal["weekly", "monthly", "yearly"] = Field(..., description="Budget period")
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    alert_threshold: Optional[float] = Field(80, description="Alert threshold percentage", ge=0, le=100)
    
    @validator('start_date')
    def validate_date(cls, v):
        if v is not None:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v


class BudgetUpdateParams(BaseModel):
    """Parameters for updating an existing budget."""
    budget_id: Optional[str] = Field(None, description="ID of budget to update")
    budget_name: Optional[str] = Field(None, description="Name of budget to find and update")
    category_name: Optional[str] = Field(None, description="Category name to find budget")
    name: Optional[str] = Field(None, description="New budget name", min_length=1)
    amount: Optional[float] = Field(None, description="New budget amount", gt=0)
    currency: Optional[str] = Field(None, description="New currency code")
    alert_threshold: Optional[float] = Field(None, description="New alert threshold percentage", ge=0, le=100)


class BudgetWithCategoryParams(BaseModel):
    """Parameters for creating budget with category."""
    category_name: str = Field(..., description="Category name (will be created if it does not exist)", min_length=1)
    budget_name: str = Field(..., description="Budget name", min_length=1)
    amount: float = Field(..., description="Budget amount", gt=0)
    currency: Optional[str] = Field("USD", description="Currency code (e.g., USD, EUR)")
    period_type: Literal["weekly", "monthly", "yearly"] = Field(..., description="Budget period")
    start_date: Optional[str] = Field(None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    alert_threshold: Optional[float] = Field(80, description="Alert threshold percentage", ge=0, le=100)
    category_color: Optional[str] = Field(None, description="Category color (hex code)")
    category_icon: Optional[str] = Field(None, description="Category icon name")
    
    @validator('start_date', 'end_date')
    def validate_date(cls, v):
        if v is not None:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError('Invalid date format. Use YYYY-MM-DD')
        return v


class CategoryCreateParams(BaseModel):
    """Parameters for creating a new category."""
    name: str = Field(..., description="Category name", min_length=1)
    color: Optional[str] = Field("#6B7280", description="Category color (hex code)")
    icon: Optional[str] = Field("folder", description="Category icon name")


class ReceiptItemParams(BaseModel):
    """Parameters for retrieving receipt items."""
    receipt_id: Optional[str] = Field(None, description="Receipt ID to get items from")
    transaction_id: Optional[str] = Field(None, description="Transaction ID to find related receipt")


class SpendingAnalysisParams(BaseModel):
    """Parameters for spending analysis."""
    period: Optional[Literal["week", "month", "year"]] = Field("month", description="Analysis period")


class BudgetFilterParams(BaseModel):
    """Parameters for filtering budgets."""
    category_name: Optional[str] = Field(None, description="Filter by category name")


class ToolDefinition(BaseModel):
    """Schema for tool definitions used by AI function calling."""
    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    parameters: Dict[str, Any] = Field(..., description="JSON schema for tool parameters")
    required: List[str] = Field(default_factory=list, description="Required parameter names")


class ReceiptsByTransactionParams(BaseModel):
    """Parameters for getting receipts by transaction."""
    transaction_id: str = Field(..., description="Transaction ID to find receipts for")
