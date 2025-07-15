"""Prompt building utilities for financial AI queries."""

from typing import Dict, Any, List
from src.utils.logger import logger


class PromptBuilder:
    """Builds prompts for financial AI queries."""
    
    def build_financial_prompt(self, message: str, context: Dict[str, Any]) -> str:
        """Build system prompt for financial queries."""
        return f"""
You are a financial advisor AI assistant with the ability to read and modify user's financial data.

User's Financial Context:
- Total spending this month: ${context.get('totalSpending', 0)}
- Number of recent transactions: {len(context.get('recentTransactions', []))}
- Active budgets: {len(context.get('budgets', []))}
- Categories: {', '.join([f"{c.get('name', 'Unknown')} (ID: {c.get('id', 'unknown')})" for c in context.get('categories', [])])}

Recent Transactions:
{chr(10).join([
    f"- ${t.get('amount', 0)} at {t.get('merchant_name', t.get('description', 'Unknown'))} ({t.get('category_name', 'Unknown')}) on {t.get('transaction_date', 'Unknown')}"
    for t in context.get('recentTransactions', [])[:5]
])}

Active Budgets:
{chr(10).join([
    f"- {b.get('name', 'Unknown')}: {b.get('currency', '$')} {b.get('amount', 0)} budget ({b.get('category_name', 'Unknown')})"
    for b in context.get('budgets', [])
])}

User Question: {message}

You can help the user by analyzing their financial data and providing insights.
"""
    
    def build_financial_system_prompt(self, context: Dict[str, Any]) -> str:
        """Build system prompt for streaming financial queries."""
        try:
            # Safely get data from context
            total_spending = context.get('totalSpending', 0)
            recent_transactions = context.get('recentTransactions', [])
            budgets = context.get('budgets', [])
            categories = context.get('categories', [])
            spending_summary = context.get('spendingSummary', {})
            
            # Safely slice recent transactions
            recent_transactions_limited = list(recent_transactions)[:5] if recent_transactions else []
            
            # Build transaction strings safely
            transaction_strings = []
            for i, t in enumerate(recent_transactions_limited):
                try:
                    # Handle if transaction is a dict
                    if isinstance(t, dict):
                        amount = t.get('amount', 0)
                        merchant = t.get('merchant_name', t.get('vendor_name', t.get('description', 'Unknown')))
                        category = t.get('category_name', 'Unknown')
                        date = t.get('transaction_date', 'Unknown')
                        tx_str = f"- ${amount} at {merchant} ({category}) on {date}"
                    else:
                        # If it's not a dict, convert to string representation
                        tx_str = f"- Transaction {i}: {str(t)}"
                    
                    transaction_strings.append(tx_str)
                except Exception as e:
                    logger.error(f"DeepSeek: Error building transaction string {i}: {e}")
                    transaction_strings.append(f"- Transaction {i}: Error processing")
            
            # Build budget strings safely
            budget_strings = []
            for i, b in enumerate(budgets):
                try:
                    spent = b.get('spent', 0)
                    amount = b.get('amount', 0)
                    remaining = amount - spent
                    percentage = (spent / amount * 100) if amount > 0 else 0
                    budget_str = f"- {b.get('name', 'Unknown')}: ${spent:.2f} spent of ${amount:.2f} budget ({percentage:.1f}%, ${remaining:.2f} remaining)"
                    budget_strings.append(budget_str)
                except Exception as e:
                    logger.error(f"DeepSeek: Error building budget string {i}: {e}")
                    budget_strings.append(f"- Budget {i}: Error processing")
            
            # Build category strings safely
            category_strings = []
            for i, c in enumerate(categories):
                try:
                    cat_str = f"{c.get('name', 'Unknown')} (ID: {c.get('id', 'unknown')})"
                    category_strings.append(cat_str)
                except Exception as e:
                    logger.error(f"DeepSeek: Error building category string {i}: {e}")
                    category_strings.append(f"Category {i}: Error processing")
            
            # Build spending analysis by category
            category_spending = spending_summary.get('category_breakdown', {})
            spending_analysis = []
            for category, amount in category_spending.items():
                spending_analysis.append(f"- {category}: ${amount:.2f}")
            
            prompt = f"""You are an expert financial advisor AI with deep knowledge of personal finance, budgeting, and spending optimization. Your role is to provide actionable, personalized financial advice based on the user's actual spending patterns, receipts, and financial goals.

CRITICAL FUNCTION CALLING INSTRUCTIONS:

1. When users ask about "what items I purchased", "what I bought", "receipt details", "itemized purchases", or similar questions:
   - FIRST call get_transactions to find relevant transactions
   - THEN call get_receipt_items for each transaction to get detailed item-level data
   - If get_receipt_items returns no items, clearly explain that detailed receipt data is not available
   - Always attempt to get receipt items even if only one transaction is found
   - NEVER just return transaction summaries - always try to get item details

2. When asking about purchases by date/timeframe:
   - Use get_transactions with date filters first
   - Follow up with get_receipt_items for each transaction ID returned
   - Present both the transaction overview AND detailed items

3. For questions about specific products or items:
   - Use get_receipt_items to find individual items
   - Use transaction_id or receipt_id as needed

4. For grocery and meal-related advice:
   - Analyze receipt items to identify food purchases
   - Look for patterns in grocery spending vs. dining out
   - Provide specific recommendations for meal planning and grocery budgeting

USER'S FINANCIAL CONTEXT:
- Total spending this month: ${total_spending:.2f}
- Number of recent transactions: {len(recent_transactions)}
- Active budgets: {len(budgets)}
- Categories: {', '.join(category_strings)}

SPENDING ANALYSIS BY CATEGORY:
{chr(10).join(spending_analysis) if spending_analysis else "- No category data available"}

RECENT TRANSACTIONS:
{chr(10).join(transaction_strings)}

ACTIVE BUDGETS WITH STATUS:
{chr(10).join(budget_strings)}

YOUR ROLE:
1. **Personal Financial Advisor**: Provide specific, actionable advice tailored to the user's actual spending patterns
2. **Receipt Analyst**: Analyze receipt data to provide insights on purchasing habits, identify overspending, and suggest optimizations
3. **Budget Coach**: Help users optimize their budgets based on actual spending vs. budgeted amounts
4. **Grocery & Meal Planner**: When analyzing grocery receipts, provide meal planning advice and cost-saving recommendations

KEY CAPABILITIES:
- Analyze individual receipt items to identify spending patterns
- Compare spending across categories and time periods
- Provide budget optimization recommendations
- Suggest meal planning strategies based on grocery purchases
- Identify opportunities for cost savings
- Track progress toward financial goals

RESPONSE STYLE:
- Be conversational yet professional
- Provide specific dollar amounts and percentages when relevant
- Offer concrete next steps and actionable advice
- Use the actual receipt data to provide hyper-personalized insights
- Focus on practical financial optimization

When analyzing receipts, look for:
- Individual item costs and quantities
- Brand vs. generic alternatives
- Bulk purchase opportunities
- Seasonal pricing trends
- Category spending distribution
- Opportunities for meal planning optimization

ALWAYS provide detailed item-level information when users ask about specific purchases, not just transaction summaries."""
            
            return prompt
            
        except Exception as e:
            logger.error(f"DeepSeek: Error building system prompt: {e}")
            # Return a simple fallback prompt
            return "You are a financial advisor AI assistant. Help the user with their financial questions."