from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    color: str = Field(default="#6B7280", max_length=7)
    icon: str = Field(default="folder", max_length=50)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=50)


class CategoryResponse(CategoryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    is_default: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True