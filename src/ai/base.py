"""Base AI service with common utilities."""

import os
import json
import httpx
from typing import Dict, Any, List
from decimal import Decimal
from datetime import datetime
from uuid import UUID
from src.middleware.error_handler import create_error
from src.utils.logger import logger


class BaseAIService:
    """Base class for AI services with common utilities."""
    
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.base_url = "https://api.deepseek.com/v1"
        self.model = "deepseek-chat"
        
        if not self.api_key:
            logger.warning("DeepSeek API key not found. AI features will be disabled.")
    
    def _json_serializable(self, obj: Any) -> Any:
        """Convert objects to JSON serializable format."""
        if isinstance(obj, dict):
            return {key: self._json_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._json_serializable(item) for item in obj]
        elif isinstance(obj, UUID):
            return str(obj)
        elif isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        else:
            return obj
    
    async def _make_api_request(self, prompt: str, max_tokens: int = 100) -> str:
        """Make basic API request."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": max_tokens,
                        "temperature": 0,
                        "stream": False,
                        "n": 1
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    }
                )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"] or ""
            else:
                logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
                return ""
        
        except Exception as error:
            logger.error(f"DeepSeek: API request failed: {error}")
            return ""