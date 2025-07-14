# AI Services Module

This module contains the refactored AI services that were previously in a single large `deepseek_service.py` file.

## Structure

```
src/ai/
├── __init__.py              # Module initialization
├── base.py                  # Base AI service with common utilities
├── deepseek_service.py      # Main orchestrating service
├── receipt_parser.py        # Receipt parsing functionality
├── categorizer.py           # Transaction/item categorization
├── api_client.py            # DeepSeek API client with tool calling
├── response_formatters.py   # Response formatting utilities
├── prompt_builder.py        # Prompt building utilities
└── README.md               # This file
```

## Components

### BaseAIService (`base.py`)
- Common utilities for all AI services
- JSON serialization helpers
- Basic API request functionality

### DeepSeekService (`deepseek_service.py`)
- Main orchestrating service
- Combines all other AI services
- Maintains the same public interface as the original service

### ReceiptParserService (`receipt_parser.py`)
- Handles receipt text parsing using AI
- Validates and normalizes parsed data
- Specialized prompts for receipt extraction

### CategorizerService (`categorizer.py`)
- Transaction and item categorization
- Simple categorization prompts
- Fallback to "other" category on errors

### DeepSeekAPIClient (`api_client.py`)
- Low-level API client for DeepSeek
- Function calling capabilities
- Tool result handling

### ResponseFormatter (`response_formatters.py`)
- Formats AI responses into structured data
- Handles different response types (budgets, transactions, receipts)
- Regex-based fallback parsing

### PromptBuilder (`prompt_builder.py`)
- Builds prompts for financial queries
- Context-aware prompt generation
- Safe handling of transaction data

## Migration

The refactoring maintains complete backward compatibility. All existing imports have been updated:

- `src.services.deepseek_service` → `src.ai.deepseek_service`

## Benefits

1. **Modularity**: Each component has a single responsibility
2. **Maintainability**: Easier to modify and test individual components
3. **Reusability**: Components can be used independently
4. **Scalability**: Easy to add new AI services or modify existing ones