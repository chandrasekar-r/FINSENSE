# Tools Service Module

This module contains the refactored tool service that was previously in a single large `tool_service.py` file. The tools service provides AI function calling capabilities for financial operations.

## Structure

```
src/tools/
├── __init__.py              # Module initialization
├── base.py                  # Base tool classes and utilities
├── tool_service.py          # Main orchestrating service
├── transaction_tools.py     # Transaction-related tools
├── budget_tools.py          # Budget-related tools
├── category_tools.py        # Category-related tools
├── receipt_tools.py         # Receipt-related tools
├── models.py                # Tool models and schemas
└── README.md               # This file
```

## Components

### BaseToolService (`base.py`)
- Common utilities for all tools
- ToolResult class for standardized responses
- Base validation and error handling

### ToolService (`tool_service.py`)
- Main orchestrating service
- Combines all tool implementations
- Maintains the same public interface as the original service

### TransactionTools (`transaction_tools.py`)
- Add, update, delete, and retrieve transactions
- Transaction filtering and analysis

### BudgetTools (`budget_tools.py`)
- Create, update, delete, and retrieve budgets
- Budget status tracking and alerts

### CategoryTools (`category_tools.py`)
- Create and manage spending categories
- Category-based operations

### ReceiptTools (`receipt_tools.py`)
- Receipt item retrieval and analysis
- Receipt-transaction linking

### Models (`models.py`)
- Tool parameter schemas
- Response models
- Validation utilities

## Migration

The refactoring maintains complete backward compatibility. All existing imports have been updated:

- `src.services.tool_service` → `src.tools.tool_service`

## Benefits

1. **Modularity**: Each tool type has its own file
2. **Maintainability**: Easier to modify and test individual tools
3. **Reusability**: Tools can be used independently
4. **Scalability**: Easy to add new tools or modify existing ones
5. **Documentation**: Comprehensive documentation for each tool
