import Joi from 'joi';

export const updateUserSchema = Joi.object({
  first_name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
  }),
  last_name: Joi.string().min(2).max(50).optional().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
  }),
  default_currency: Joi.string().length(3).optional().messages({
    'string.length': 'Currency must be a 3-character code (e.g., USD, EUR)',
  }),
});