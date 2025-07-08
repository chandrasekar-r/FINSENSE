import Joi from 'joi';

export const chatQuerySchema = Joi.object({
  message: Joi.string().min(1).max(1000).required().messages({
    'string.min': 'Message cannot be empty',
    'string.max': 'Message must not exceed 1000 characters',
    'any.required': 'Message is required',
  }),
});