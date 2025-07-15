"""Tools Service Module for AI function calling.

This module provides a comprehensive set of AI tools for financial operations,
including transaction management, budget tracking, category management, and
receipt processing.

Usage:
    from src.tools.tool_service import ToolService
    
    tool_service = ToolService()
    tools = tool_service.get_available_tools()
    result = await tool_service.execute_tool("add_transaction", params, user_id)
"""

from src.tools.tool_service import ToolService

__all__ = ['ToolService']
