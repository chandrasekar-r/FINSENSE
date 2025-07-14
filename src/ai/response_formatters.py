"""Response formatting utilities for AI responses."""

import re
import json
from typing import Dict, Any, List
from src.utils.logger import logger


class ResponseFormatter:
    """Formats AI responses into structured data."""
    
    def post_process_response(self, raw_response: str, tool_results: List[Dict]) -> Dict[str, Any]:
        """Post-process AI response into structured format based on tools used."""
        try:
            # Determine response type based on tools executed
            response_type = self._determine_response_type(tool_results)
            
            # Fallback: detect response type from content if tools didn't work
            if response_type == "text":
                if "Budget" in raw_response and ("spent" in raw_response.lower() or "remaining" in raw_response.lower()):
                    response_type = "budget_breakdown"
                elif "transactions" in raw_response.lower() and ("amount" in raw_response.lower() or "$" in raw_response):
                    response_type = "transaction_list"
            
            if response_type == "budget_breakdown":
                return self._format_budget_response(raw_response, tool_results)
            elif response_type == "spending_analysis":
                return self._format_spending_response(raw_response, tool_results)
            elif response_type == "transaction_list":
                return self._format_transaction_response(raw_response, tool_results)
            elif response_type == "receipt_details":
                return self._format_receipt_response(raw_response, tool_results)
            else:
                return {"type": "text", "content": raw_response}
        
        except Exception as e:
            logger.error(f"Post-processing failed: {e}")
            return {"type": "text", "content": raw_response}
    
    def _determine_response_type(self, tool_results: List[Dict]) -> str:
        """Determine response type based on tools used."""
        tool_names = []
        for tr in tool_results:
            try:
                result = tr.get('result', {})
                # Safely check if result is a dict and has success=True
                if isinstance(result, dict):
                    success = result.get('success', False)
                    if success and tr.get('name'):
                        tool_names.append(tr['name'])
                else:
                    logger.warning(f"Tool result is not a dict, got {type(result).__name__}: {result}")
            except Exception as e:
                logger.warning(f"Error processing tool result: {e}")
                continue
        
        if 'get_budgets' in tool_names:
            return "budget_breakdown"
        elif 'get_spending_analysis' in tool_names:
            return "spending_analysis"
        elif 'get_receipt_items' in tool_names:
            return "receipt_details"
        elif 'get_transactions' in tool_names:
            return "transaction_list"
        else:
            return "text"
    
    def _format_budget_response(self, raw_response: str, tool_results: List[Dict]) -> Dict[str, Any]:
        """Format budget breakdown response."""
        budget_data = None
        
        # Extract budget data from tool results
        for tr in tool_results:
            if tr['name'] == 'get_budgets':
                result = tr.get('result', {})
                if isinstance(result, dict) and result.get('success'):
                    budget_data = result.get('data')
                    break
        
        if not budget_data:
            # Try to extract budget information from the raw response
            return self._extract_budget_from_text(raw_response)
        
        # Calculate totals
        total_budgeted = sum(float(b.get('amount', 0)) for b in budget_data)
        total_spent = sum(float(b.get('spent_amount', 0)) for b in budget_data)
        remaining_budget = total_budgeted - total_spent
        
        # Format budget items
        budgets = []
        for budget in budget_data:
            spent = float(budget.get('spent_amount', 0))
            amount = float(budget.get('amount', 0))
            remaining = amount - spent
            percentage = (spent / amount * 100) if amount > 0 else 0
            
            status = "On track"
            if percentage >= 100:
                status = "Over budget"
            elif percentage >= 80:
                status = "Warning"
            
            budgets.append({
                "name": budget.get('name', 'Unknown Budget'),
                "category": budget.get('category_name', 'Unknown'),
                "budget_amount": amount,
                "spent": spent,
                "remaining": remaining,
                "percentage_used": round(percentage, 1),
                "status": status
            })
        
        return {
            "type": "budget_breakdown",
            "content": {
                "message": raw_response,
                "data": {
                    "total_budgeted": total_budgeted,
                    "total_spent": total_spent,
                    "remaining_budget": remaining_budget,
                    "currency": "EUR",  # Could be dynamic
                    "budgets": budgets
                }
            }
        }
    
    def _extract_budget_from_text(self, raw_response: str) -> Dict[str, Any]:
        """Extract budget information from text response as fallback."""
        # Extract budget sections using regex
        budget_pattern = r'### (\d+)\.\s+(.+?)\s+Budget\s*\n(.*?)(?=###|\Z)'
        matches = re.findall(budget_pattern, raw_response, re.DOTALL)
        
        budgets = []
        total_spent = 0
        total_budgeted = 0
        
        for match in matches:
            index, name, content = match
            
            # Extract budget amount
            budget_match = re.search(r'Budget:\s*\$(\d+(?:\.\d{2})?)', content)
            budget_amount = float(budget_match.group(1)) if budget_match else 0
            
            # Extract spent amount
            spent_match = re.search(r'Spent so far:\s*\$(\d+(?:\.\d{2})?)', content)
            spent = float(spent_match.group(1)) if spent_match else 0
            
            # Extract remaining amount
            remaining_match = re.search(r'Remaining:\s*\$(\d+(?:\.\d{2})?)', content)
            remaining = float(remaining_match.group(1)) if remaining_match else (budget_amount - spent)
            
            # Extract percentage
            percentage_match = re.search(r'Percentage used:\s*(\d+(?:\.\d{2})?)%', content)
            percentage = float(percentage_match.group(1)) if percentage_match else 0
            
            # Determine status
            status = "On track"
            if percentage >= 100:
                status = "Over budget"
            elif percentage >= 80:
                status = "Warning"
            
            budgets.append({
                "name": name.strip(),
                "category": name.lower().replace(' ', '_'),
                "budget_amount": budget_amount,
                "spent": spent,
                "remaining": remaining,
                "percentage_used": round(percentage, 1),
                "status": status
            })
            
            total_spent += spent
            total_budgeted += budget_amount
        
        # Extract overall totals if available
        overall_match = re.search(r'Total spending this month:\s*\$(\d+(?:\.\d{2})?)', raw_response)
        if overall_match:
            total_spent = float(overall_match.group(1))
        
        remaining_budget = total_budgeted - total_spent
        
        return {
            "type": "budget_breakdown",
            "content": {
                "message": raw_response,
                "data": {
                    "total_budgeted": total_budgeted,
                    "total_spent": total_spent,
                    "remaining_budget": remaining_budget,
                    "currency": "USD",  # Detected from $ signs
                    "budgets": budgets
                }
            }
        }
    
    def _format_spending_response(self, raw_response: str, tool_results: List[Dict]) -> Dict[str, Any]:
        """Format spending analysis response."""
        spending_data = None
        
        # Extract spending data from tool results
        for tr in tool_results:
            if tr['name'] == 'get_spending_analysis':
                result = tr.get('result', {})
                if isinstance(result, dict) and result.get('success'):
                    spending_data = result.get('data')
                    break
        
        if not spending_data:
            return {"type": "text", "content": raw_response}
        
        return {
            "type": "spending_analysis",
            "content": {
                "message": raw_response,
                "data": spending_data
            }
        }
    
    def _format_transaction_response(self, raw_response: str, tool_results: List[Dict]) -> Dict[str, Any]:
        """Format transaction list response with enhanced analysis."""
        transaction_data = None
        
        # Extract transaction data from tool results
        for tr in tool_results:
            if tr['name'] == 'get_transactions':
                result = tr.get('result', {})
                if isinstance(result, dict) and result.get('success'):
                    transaction_data = result.get('data')
                    break
        
        if not transaction_data:
            return {"type": "text", "content": raw_response}
        
        # Enhanced processing for better UI display
        transactions = transaction_data.get('transactions', []) if isinstance(transaction_data, dict) else transaction_data
        
        if not transactions:
            return {"type": "text", "content": raw_response}
        
        # Calculate enhanced analytics
        analytics = self._calculate_transaction_analytics(transactions)
        
        return {
            "type": "transaction_list",
            "content": {
                "message": raw_response,
                "data": {
                    "transactions": transactions,
                    "analytics": analytics,
                    "total": len(transactions),
                    "page": transaction_data.get('page', 1) if isinstance(transaction_data, dict) else 1,
                    "limit": transaction_data.get('limit', len(transactions)) if isinstance(transaction_data, dict) else len(transactions),
                    "total_pages": transaction_data.get('total_pages', 1) if isinstance(transaction_data, dict) else 1
                }
            }
        }
    
    def _calculate_transaction_analytics(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Calculate analytics for transaction data."""
        if not transactions:
            return {}
        
        try:
            # Category breakdown
            category_totals = {}
            daily_totals = {}
            total_amount = 0
            currencies = set()
            
            for tx in transactions:
                amount = float(tx.get('amount', 0))
                category = tx.get('category_name', 'Unknown')
                currency = tx.get('currency', 'USD')
                date_str = tx.get('transaction_date', '')
                
                total_amount += amount
                currencies.add(currency)
                
                # Category breakdown
                if category in category_totals:
                    category_totals[category]['amount'] += amount
                    category_totals[category]['count'] += 1
                else:
                    category_totals[category] = {'amount': amount, 'count': 1}
                
                # Daily breakdown
                if date_str:
                    try:
                        # Extract date part only (YYYY-MM-DD)
                        date_part = date_str.split('T')[0] if 'T' in date_str else date_str.split(' ')[0]
                        if date_part in daily_totals:
                            daily_totals[date_part]['amount'] += amount
                            daily_totals[date_part]['count'] += 1
                        else:
                            daily_totals[date_part] = {'amount': amount, 'count': 1}
                    except Exception:
                        pass
            
            # Format category data
            category_breakdown = []
            for category, data in category_totals.items():
                percentage = (data['amount'] / total_amount * 100) if total_amount > 0 else 0
                category_breakdown.append({
                    'category': category,
                    'amount': data['amount'],
                    'count': data['count'],
                    'percentage': round(percentage, 2)
                })
            
            # Sort by amount descending
            category_breakdown.sort(key=lambda x: x['amount'], reverse=True)
            
            # Format daily data
            daily_breakdown = []
            for date, data in sorted(daily_totals.items()):
                daily_breakdown.append({
                    'date': date,
                    'amount': data['amount'],
                    'count': data['count']
                })
            
            return {
                'total_amount': total_amount,
                'transaction_count': len(transactions),
                'average_amount': total_amount / len(transactions) if transactions else 0,
                'currencies': list(currencies),
                'category_breakdown': category_breakdown,
                'daily_breakdown': daily_breakdown,
                'date_range': {
                    'start': min(tx.get('transaction_date', '') for tx in transactions if tx.get('transaction_date')),
                    'end': max(tx.get('transaction_date', '') for tx in transactions if tx.get('transaction_date'))
                } if transactions else None
            }
            
        except Exception as e:
            logger.error(f"Error calculating transaction analytics: {e}")
            return {'error': 'Failed to calculate analytics'}
    
    def _format_receipt_response(self, raw_response: str, tool_results: List[Dict]) -> Dict[str, Any]:
        """Format receipt details response."""
        receipt_data = None
        transaction_data = None
        
        # Extract receipt and transaction data from tool results
        for tr in tool_results:
            result = tr.get('result', {})
            if isinstance(result, dict) and result.get('success'):
                if tr['name'] == 'get_receipt_items':
                    receipt_data = result.get('data')
                elif tr['name'] == 'get_transactions':
                    transaction_data = result.get('data')
        
        if not receipt_data:
            return {"type": "text", "content": raw_response}
        
        # Use transaction data to get merchant and date if available
        merchant = "Unknown Merchant"
        date = "Unknown Date"
        total_amount = 0
        
        if transaction_data and len(transaction_data) > 0:
            tx = transaction_data[0]  # Assume first transaction
            merchant = tx.get('merchant_name', tx.get('description', 'Unknown Merchant'))
            date = tx.get('transaction_date', 'Unknown Date')
            total_amount = tx.get('amount', 0)
        
        return {
            "type": "receipt_details",
            "content": {
                "message": raw_response,
                "data": {
                    "merchant": merchant,
                    "date": date,
                    "total_amount": total_amount,
                    "currency": "EUR",  # Could be dynamic
                    "items": receipt_data.get('receipt_items', [])
                }
            }
        }