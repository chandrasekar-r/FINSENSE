import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: false
    });
    
    if (error) {
      console.error('Validation error:', error.details);
      console.error('Request body:', req.body);
      const messages = error.details.map(detail => detail.message).join(', ');
      throw createError(messages, 400);
    }
    
    // Replace req.body with validated data
    req.body = value;
    next();
  };
};