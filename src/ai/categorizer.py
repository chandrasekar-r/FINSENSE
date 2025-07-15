"""AI categorization service for transactions and items."""

from typing import Optional
from src.ai.base import BaseAIService


class CategorizerService(BaseAIService):
    """AI service for categorizing transactions and items."""
    
    async def suggest_category(self, transaction_description: str, amount: float) -> str:
        """Suggest category for transaction."""
        try:
            prompt = f"""
Based on the transaction description and amount, suggest the most appropriate category. Convert the text to english and then determine the category if that helps.

Transaction: "{transaction_description}"
Amount: ${amount}

Return only the category name, no explanation:"""
            
            response = await self._make_api_request(prompt)
            return response.strip().lower()
        except Exception:
            return "other"
    
    async def suggest_category_for_item(self, item_name: str, amount: Optional[float] = None) -> str:
        """Suggest category for item."""
        try:
            amount_text = f"\nAmount: ${amount}" if amount is not None else ""
            prompt = f"""
Based on the item name{' and amount' if amount is not None else ''}, suggest the most appropriate category.
Choose from: groceries, dining, transportation, entertainment, shopping, healthcare, utilities, travel, education, other

Item: "{item_name}"{amount_text}

Return only the category name, no explanation:"""
            
            response = await self._make_api_request(prompt)
            return response.strip().lower()
        except Exception:
            return "other"