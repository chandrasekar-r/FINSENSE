"""DeepSeek API client for financial queries with tool calling."""

import json
import httpx
from typing import Dict, Any, List, Optional, Callable
from src.ai.base import BaseAIService
from src.middleware.error_handler import create_error
from src.utils.logger import logger


class DeepSeekAPIClient(BaseAIService):
    """API client for DeepSeek with function calling capabilities."""
    
    async def make_api_request_with_tools(
        self, 
        system_prompt: str, 
        user_message: str, 
        tools: List[Dict], 
        history: List[Any]
    ) -> Dict[str, Any]:
        """Make API request with function calling."""
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                *[
                    msg for h in history 
                    for msg in [
                        {"role": "user", "content": h["user_message"]},
                        {"role": "assistant", "content": h["ai_response"]}
                    ]
                ],
                {"role": "user", "content": user_message}
            ]
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "tools": tools,
                        "tool_choice": "auto"
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
            
            if response.status_code == 200:
                result = response.json()
                choice = result["choices"][0]
                message = choice["message"]
                
                return {
                    "content": message.get("content", ""),
                    "tool_calls": message.get("tool_calls")
                }
            else:
                logger.error(f"DeepSeek API error: {response.status_code} - {response.text}")
                return {"content": await self._make_api_request(user_message)}
        
        except Exception as error:
            logger.error(f"DeepSeek: API request with tools failed: {error}")
            raise create_error("Failed to communicate with DeepSeek API", 500)
    
    async def make_api_request_with_tool_results(
        self, 
        original_prompt: str, 
        assistant_response: str, 
        tool_results: List[Dict]
    ) -> Dict[str, Any]:
        """Make API request with tool results."""
        try:
            messages = [
                {"role": "user", "content": original_prompt},
                {"role": "assistant", "content": assistant_response},
                {
                    "role": "user",
                    "content": f"Tool execution results:\n{self._format_tool_results(tool_results)}\n\nPlease provide a final response based on these results."
                }
            ]
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": 1000,
                        "temperature": 0.1
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "content": result["choices"][0]["message"]["content"] or assistant_response
                }
            else:
                return {"content": assistant_response}
        
        except Exception as error:
            logger.error(f"DeepSeek: API request with tool results failed: {error}")
            return {"content": assistant_response}
    
    async def get_complete_response(
        self,
        system_prompt: str,
        user_message: str,
        assistant_response: str,
        tool_results: List[Dict],
        history: List[Any]
    ) -> str:
        """Get complete response without streaming."""
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                *[
                    msg for h in history 
                    for msg in [
                        {"role": "user", "content": h["user_message"]},
                        {"role": "assistant", "content": h["ai_response"]}
                    ]
                ],
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": assistant_response},
                {
                    "role": "user",
                    "content": f"Tool execution results:\n{self._format_tool_results(tool_results)}\n\nPlease provide a final response based on these results."
                }
            ]
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": 1000,
                        "temperature": 0.1
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    }
                )
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"] or ""
            else:
                return assistant_response
        
        except Exception as error:
            logger.error(f"DeepSeek: Get complete response failed: {error}")
            return assistant_response
    
    def format_tools_for_api(self, tools: List[Dict]) -> List[Dict]:
        """Format tools for DeepSeek API."""
        return [
            {
                "type": "function",
                "function": {
                    "name": tool["name"],
                    "description": tool["description"],
                    "parameters": tool["parameters"]
                }
            }
            for tool in tools
        ]
    
    def _format_tool_results(self, tool_results: List[Dict]) -> str:
        """Format tool results for prompt."""
        formatted_results = []
        for tr in tool_results:
            try:
                name = tr.get('name', 'unknown')
                result = tr.get('result', {})
                
                if isinstance(result, dict):
                    success = result.get('success', False)
                    message = result.get('message', 'No message')
                    status = 'Success' if success else 'Failed'
                    line = f"{name}: {status} - {message}"
                    
                    if result.get('data'):
                        try:
                            # Make data JSON serializable before dumping
                            serializable_data = self._json_serializable(result['data'])
                            line += f"\nData: {json.dumps(serializable_data, indent=2)}"
                        except (TypeError, ValueError) as e:
                            line += f"\nData: [Unable to serialize: {e}]"
                else:
                    line = f"{name}: Error - Result is not a dict (got {type(result).__name__})"
                
                formatted_results.append(line)
            except Exception as e:
                formatted_results.append(f"Error formatting result: {e}")
        
        return "\n".join(formatted_results)