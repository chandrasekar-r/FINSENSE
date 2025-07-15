from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid


class ChatMessage(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    message: str
    response: str
    function_calls: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatHistory(BaseModel):
    messages: List[ChatResponse]
    total_count: int