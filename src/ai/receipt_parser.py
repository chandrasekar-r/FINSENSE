"""Receipt parsing AI service."""

import json
import httpx
from typing import Dict, Any
from src.ai.base import BaseAIService
from src.middleware.error_handler import create_error
from src.utils.logger import logger


class ReceiptParserService(BaseAIService):
    """AI service for parsing receipt text."""
    
    async def parse_receipt_data(self, extracted_text: str) -> Dict[str, Any]:
        """Parse receipt text using AI."""
        if not self.api_key:
            raise create_error("DeepSeek API key not configured", 500)
        
        try:
            response = await self._make_receipt_parsing_request(extracted_text)
            
            try:
                parsed_data = json.loads(response)
                return self._validate_parsed_data(parsed_data)
            except json.JSONDecodeError as parse_error:
                logger.error(f"DeepSeek: JSON parse failed: {parse_error}")
                logger.error(f"DeepSeek: Raw response that failed to parse: {response}")
                
                # Try to fix incomplete JSON by adding missing closing brackets
                try:
                    fixed_response = self._attempt_json_fix(response)
                    if fixed_response:
                        parsed_data = json.loads(fixed_response)
                        logger.info("Successfully fixed incomplete JSON response")
                        return self._validate_parsed_data(parsed_data)
                except Exception as fix_error:
                    logger.warning(f"JSON fix attempt failed: {fix_error}")
                
                # If fixing failed and text is long, try with truncated text
                if len(extracted_text) > 1000:
                    logger.info("Retrying with truncated text due to JSON parse failure")
                    try:
                        truncated_text = extracted_text[:1000] + "..."
                        retry_response = await self._make_receipt_parsing_request(truncated_text)
                        parsed_data = json.loads(retry_response)
                        logger.info("Successfully parsed with truncated text")
                        return self._validate_parsed_data(parsed_data)
                    except Exception as retry_error:
                        logger.warning(f"Retry with truncated text failed: {retry_error}")
                
                raise create_error("Failed to parse receipt data from DeepSeek API response", 422)
        
        except Exception as error:
            logger.error(f"DeepSeek: Receipt parsing error: {error}")
            raise error
    
    async def _make_receipt_parsing_request(self, extracted_text: str) -> str:
        """Make API request for receipt parsing."""
        try:
            optimized_prompt = f"""Extract receipt data as JSON with detailed categorization:

Categories to use:
- groceries: food, beverages, household items, personal care
- restaurants: dining out, fast food, coffee shops
- transport: gas, public transport, parking, taxi/uber
- entertainment: movies, games, books, sports events
- shopping: clothing, electronics, home goods
- health: pharmacy, medical, fitness
- utilities: electricity, water, internet, phone
- other: anything that doesn't fit above

{{
  "merchantName": "store name",
  "totalAmount": number,
  "currency": "EUR/USD", 
  "date": "YYYY-MM-DD",
  "category": "main category from list above",
  "items": [
    {{
      "name": "item name",
      "amount": number,
      "category": "specific category from list above based on item type"
    }}
  ],
  "confidence": 0-100
}}

Analyze each item and assign the most appropriate category. For grocery stores, individual items should still get specific categories (e.g., "health" for vitamins, "groceries" for food).

Receipt: {extracted_text}"""
            
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "user",
                                "content": optimized_prompt
                            }
                        ],
                        "max_tokens": 2000,
                        "temperature": 0.7,
                        "stream": False,
                        "n": 1,
                        "response_format": {"type": "json_object"}
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    }
                )
            
            if response.status_code != 200:
                logger.error(f"DeepSeek: API error: {response.status_code} - {response.text}")
                if response.status_code == 429:
                    raise create_error("DeepSeek API rate limit exceeded", 429)
                raise create_error(f"DeepSeek API error: {response.text}", response.status_code)
            
            result = response.json()
            return result["choices"][0]["message"]["content"] or ""
        
        except httpx.TimeoutException:
            logger.error("DeepSeek: API request timeout")
            raise create_error("DeepSeek API connection timeout", 503)
        except Exception as error:
            logger.error(f"DeepSeek: API request failed: {error}")
            raise error
    
    def _validate_parsed_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and normalize parsed receipt data."""
        if not data or not isinstance(data, dict):
            raise ValueError("Invalid parsed data format")
        
        return {
            "merchantName": data.get("merchantName", "Unknown Merchant"),
            "totalAmount": float(data.get("totalAmount", 0)),
            "currency": data.get("currency", "USD"),
            "date": data.get("date"),
            "category": data.get("category", "other"),
            "items": data.get("items", []) if isinstance(data.get("items"), list) else [],
            "confidence": max(0.0, min(1.0, float(data.get("confidence", 0.5))))
        }
    
    def _attempt_json_fix(self, response: str) -> str:
        """Attempt to fix incomplete JSON responses."""
        try:
            # Count brackets to determine what's missing
            open_brackets = response.count('{') - response.count('}')
            open_square = response.count('[') - response.count(']')
            
            # If we have incomplete structure, try to close it
            if open_brackets > 0 or open_square > 0:
                fixed = response.rstrip()
                
                # Handle case where the response ends mid-field (like "amount": 2)
                # Look for incomplete number or string values
                import re
                
                # If it ends with an incomplete number, try to complete it
                if re.search(r'"amount":\s*\d+$', fixed):
                    # Just a number without decimal, that's fine
                    pass
                elif re.search(r'"amount":\s*\d+\.$', fixed):
                    # Ends with decimal point, add zero
                    fixed += '0'
                
                # Remove any trailing commas that might cause issues
                if fixed.endswith(','):
                    fixed = fixed[:-1]
                
                # Add missing closing brackets for objects first (inside arrays)
                # This ensures each item object is properly closed before closing the array
                fixed += '}' * max(0, open_brackets - 1)  # Keep one open for the main object
                
                # Add missing closing brackets for arrays
                fixed += ']' * open_square
                
                # Add the final closing bracket for the main object
                if open_brackets > 0:
                    fixed += '}'
                
                return fixed
            
            return None
        except Exception:
            return None