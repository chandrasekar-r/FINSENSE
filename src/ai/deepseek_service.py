"""Refactored DeepSeek AI service."""

import json
from typing import Dict, Any, List, Optional, Callable
from src.ai.base import BaseAIService
from src.ai.receipt_parser import ReceiptParserService
from src.ai.categorizer import CategorizerService
from src.ai.api_client import DeepSeekAPIClient
from src.ai.response_formatters import ResponseFormatter
from src.ai.prompt_builder import PromptBuilder
from src.utils.logger import logger


class DeepSeekService(BaseAIService):
    """Main DeepSeek AI service that orchestrates all AI functionality."""
    
    def __init__(self):
        super().__init__()
        self.receipt_parser = ReceiptParserService()
        self.categorizer = CategorizerService()
        self.api_client = DeepSeekAPIClient()
        self.response_formatter = ResponseFormatter()
        self.prompt_builder = PromptBuilder()
    
    async def parse_receipt_data(self, extracted_text: str) -> Dict[str, Any]:
        """Parse receipt text using AI."""
        return await self.receipt_parser.parse_receipt_data(extracted_text)
    
    async def suggest_category(self, transaction_description: str, amount: float) -> str:
        """Suggest category for transaction."""
        return await self.categorizer.suggest_category(transaction_description, amount)
    
    async def suggest_category_for_item(self, item_name: str, amount: Optional[float] = None) -> str:
        """Suggest category for item."""
        return await self.categorizer.suggest_category_for_item(item_name, amount)
    
    async def process_financial_query(
        self, 
        message: str, 
        context: Dict[str, Any], 
        user_id: Optional[str] = None,
        tool_service: Optional[Any] = None
    ) -> str:
        """Process financial query with function calling."""
        try:
            if not tool_service:
                raise ValueError("ToolService instance is required for process_financial_query")
            
            available_tools = self.api_client.format_tools_for_api(tool_service.get_available_tools())
            prompt = self.prompt_builder.build_financial_prompt(message, context)
            
            response = await self.api_client.make_api_request_with_tools(prompt, message, available_tools, [])
            
            if user_id and response.get("tool_calls"):
                tool_results = []
                for tool_call in response["tool_calls"]:
                    args = json.loads(tool_call["function"]["arguments"])
                    args["message"] = message
                    result = await tool_service.execute_tool(
                        tool_call["function"]["name"],
                        args,
                        user_id
                    )
                    tool_results.append({"name": tool_call["function"]["name"], "result": result})
                
                response = await self.api_client.make_api_request_with_tool_results(
                    prompt, response.get("content", ""), tool_results
                )
                
                # Post-process the response for non-streaming
                raw_response = response.get("content", response)
                structured_response = self.response_formatter.post_process_response(raw_response, tool_results)
                
                if structured_response.get("type") != "text":
                    # Make the structured response JSON serializable
                    serializable_response = self._json_serializable(structured_response)
                    return json.dumps(serializable_response)
                else:
                    return raw_response
            
            return response.get("content", response)
        
        except Exception as error:
            logger.error(f"DeepSeek: Financial query failed: {error}")
            raise error
    
    async def process_financial_query_stream(
        self,
        message: str,
        context: Dict[str, Any],
        on_chunk: Callable[[str], None],
        user_id: Optional[str] = None,
        history: List[Any] = None,
        tool_service: Optional[Any] = None
    ) -> None:
        """Process financial query with streaming response."""
        if history is None:
            history = []
        
        try:
            if not tool_service:
                raise ValueError("ToolService instance is required for streaming query")
            
            available_tools = self.api_client.format_tools_for_api(tool_service.get_available_tools())
            system_prompt = self.prompt_builder.build_financial_system_prompt(context)
            
            await self._make_api_request_with_tools_stream(
                system_prompt, message, available_tools, on_chunk, user_id, history, tool_service
            )
        
        except Exception as error:
            logger.error(f"DeepSeek: Streaming financial query failed: {error}")
            raise error
    
    async def _make_api_request_with_tools_stream(
        self,
        system_prompt: str,
        user_message: str,
        tools: List[Dict],
        on_chunk: Callable[[str], None],
        user_id: Optional[str] = None,
        history: List[Any] = None,
        tool_service: Optional[Any] = None
    ) -> None:
        """Make streaming API request with tools."""
        if history is None:
            history = []
        
        try:
            initial_response = await self.api_client.make_api_request_with_tools(
                system_prompt, user_message, tools, history
            )
            
            if user_id and initial_response.get("tool_calls") and tool_service:
                on_chunk("🔍 Looking up your data...\n\n")
                
                tool_results = []
                for tool_call in initial_response["tool_calls"]:
                    result = await tool_service.execute_tool(
                        tool_call["function"]["name"],
                        json.loads(tool_call["function"]["arguments"]),
                        user_id
                    )
                    tool_results.append({"name": tool_call["function"]["name"], "result": result})
                    
                    on_chunk(f"✅ Found your {tool_call['function']['name'].replace('get_', '').replace('_', ' ')} data\n\n")
                
                on_chunk("📊 Analyzing your data...\n\n")
                await self._stream_final_response(
                    system_prompt, user_message, initial_response["content"], tool_results, on_chunk, history
                )
            else:
                content = initial_response.get("content", "I'm not sure how to help with that. Could you rephrase your question?")
                # Stream the content in chunks
                words = content.split()
                for i in range(0, len(words), 5):  # 5 words at a time
                    chunk = " ".join(words[i:i+5]) + " "
                    on_chunk(chunk)
        
        except Exception as error:
            logger.error(f"DeepSeek: Streaming request with tools failed: {error}")
            raise error
    
    async def _stream_final_response(
        self,
        system_prompt: str,
        user_message: str,
        assistant_response: str,
        tool_results: List[Dict],
        on_chunk: Callable[[str], None],
        history: List[Any]
    ) -> None:
        """Stream final response after tool execution with post-processing."""
        try:
            # First get the complete response
            complete_response = await self.api_client.get_complete_response(
                system_prompt, user_message, assistant_response, tool_results, history
            )
            
            # Post-process the response to determine structure
            structured_response = self.response_formatter.post_process_response(complete_response, tool_results)
            
            # Send the structured response as a special chunk
            if structured_response.get("type") != "text":
                # Make the structured response JSON serializable
                serializable_response = self._json_serializable(structured_response)
                structured_json = json.dumps({"__structured__": serializable_response})
                on_chunk(structured_json)
            else:
                # Stream the text content word by word for better UX
                words = complete_response.split()
                for i in range(0, len(words), 3):  # 3 words at a time
                    chunk = " ".join(words[i:i+3]) + " "
                    on_chunk(chunk)
        
        except Exception as error:
            logger.error(f"DeepSeek: Streaming final response failed: {error}")
            raise error