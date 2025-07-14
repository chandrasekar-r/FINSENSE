from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class BudgetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(..., max_length=3)
    period_type: str = Field(..., pattern="^(monthly|weekly|yearly)$")
    start_date: date
    end_date: Optional[date] = None
    alert_threshold: int = Field(default=80, ge=0, le=100)


class BudgetCreate(BudgetBase):
    category_id: uuid.UUID


class BudgetUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, max_length=3)
    period_type: Optional[str] = Field(None, pattern="^(monthly|weekly|yearly)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    alert_threshold: Optional[int] = Field(None, ge=0, le=100)
    category_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


class BudgetResponse(BudgetBase):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    # Related data
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    
    # Status fields (populated when includeStatus=true)
    budget_amount: Optional[Decimal] = None
    spent_amount: Optional[Decimal] = None
    remaining_amount: Optional[Decimal] = None
    percentage_used: Optional[float] = None
    days_remaining: Optional[int] = None
    alert_triggered: Optional[bool] = None
    status: Optional[str] = None  # on_track, warning, over_budget
    
    class Config:
        from_attributes = True


class BudgetStatus(BaseModel):
    id: uuid.UUID
    name: str
    budget_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_used: float
    days_remaining: int
    alert_triggered: bool
    status: str  # on_track, warning, over_budget
    category_name: str
    period_type: str
    currency: str