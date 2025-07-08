import Joi from 'joi';

export const createBudgetSchema = Joi.object({
  category_id: Joi.string().uuid().required(),
  name: Joi.string().min(1).max(255).required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).required(),
  period_type: Joi.string().valid('monthly', 'weekly', 'yearly').required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().optional(),
});

export const updateBudgetSchema = Joi.object({
  category_id: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(255).optional(),
  amount: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  period_type: Joi.string().valid('monthly', 'weekly', 'yearly').optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  is_active: Joi.boolean().optional(),
});