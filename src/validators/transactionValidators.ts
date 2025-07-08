import Joi from 'joi';

export const createTransactionSchema = Joi.object({
  // Primary fields
  amount: Joi.number().positive().required(),
  description: Joi.string().min(1).max(500).required(),
  category_id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.string().min(1).max(255) // Allow category names
  ).required(),
  transaction_type: Joi.string().valid('income', 'expense').optional().default('expense'),
  transaction_date: Joi.string().isoDate().optional(),
  // Vendor/merchant name - support both for backwards compatibility  
  vendor_name: Joi.string().min(1).max(255).optional().allow('', null),
  merchant_name: Joi.string().min(1).max(255).optional().allow('', null),
  currency: Joi.string().length(3).optional().default('USD'),
  tax_amount: Joi.number().min(0).optional(),
}).options({ allowUnknown: true, stripUnknown: true });

export const updateTransactionSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  description: Joi.string().min(1).max(500).optional(),
  category_id: Joi.string().uuid().optional(),
  transaction_type: Joi.string().valid('income', 'expense').optional(),
  transaction_date: Joi.string().isoDate().optional(),
  // Vendor/merchant name - support both for backwards compatibility
  vendor_name: Joi.string().min(1).max(255).optional().allow(''),
  merchant_name: Joi.string().min(1).max(255).optional().allow(''),
  currency: Joi.string().length(3).optional(),
  tax_amount: Joi.number().min(0).optional(),
});
