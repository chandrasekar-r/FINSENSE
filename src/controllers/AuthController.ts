import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { createError } from '../middleware/errorHandler';
import { CreateUserRequest, LoginRequest, UserResponse } from '../types/user';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, first_name, last_name, default_currency = 'USD' }: CreateUserRequest = req.body;

      // Check if user already exists
      const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        throw createError('Email already registered', 409);
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userResult = await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, default_currency) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, first_name, last_name, default_currency, created_at, is_active, email_verified`,
        [email, passwordHash, first_name, last_name, default_currency]
      );

      const user = userResult.rows[0] as UserResponse;

      // Create user settings
      await query(
        'INSERT INTO user_settings (user_id, default_currency) VALUES ($1, $2)',
        [user.id, default_currency]
      );

      // Create default categories
      const defaultCategories = [
        { name: 'Groceries', color: '#10B981', icon: 'shopping-cart' },
        { name: 'Dining Out', color: '#F59E0B', icon: 'utensils' },
        { name: 'Transportation', color: '#3B82F6', icon: 'car' },
        { name: 'Entertainment', color: '#8B5CF6', icon: 'film' },
        { name: 'Shopping', color: '#EC4899', icon: 'shopping-bag' },
        { name: 'Healthcare', color: '#EF4444', icon: 'heart' },
        { name: 'Utilities', color: '#06B6D4', icon: 'zap' },
        { name: 'Travel', color: '#84CC16', icon: 'plane' },
        { name: 'Education', color: '#F97316', icon: 'book' },
        { name: 'Other', color: '#6B7280', icon: 'folder' }
      ];

      for (const category of defaultCategories) {
        await query(
          'INSERT INTO categories (user_id, name, color, icon, is_default) VALUES ($1, $2, $3, $4, $5)',
          [user.id, category.name, category.color, category.icon, true]
        );
      }

      // Generate tokens
      const token = generateToken({ id: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

      // Store refresh token
      await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] // 7 days
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      // Find user
      const userResult = await query(
        `SELECT id, email, password_hash, first_name, last_name, default_currency, 
                created_at, is_active, email_verified 
         FROM users WHERE email = $1 AND is_active = true`,
        [email]
      );

      if (userResult.rows.length === 0) {
        throw createError('Invalid email or password', 401);
      }

      const user = userResult.rows[0];

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      if (!isValidPassword) {
        throw createError('Invalid email or password', 401);
      }

      // Generate tokens
      const token = generateToken({ id: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

      // Store refresh token
      await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );

      // Remove password hash from response
      const { password_hash, ...userResponse } = user;

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In a real implementation, you would blacklist the token or mark refresh tokens as revoked
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw createError('Refresh token is required', 400);
      }

      // Verify refresh token exists and is not expired
      const tokenResult = await query(
        'SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked_at IS NULL',
        [refreshToken]
      );

      if (tokenResult.rows.length === 0) {
        throw createError('Invalid or expired refresh token', 401);
      }

      const userId = tokenResult.rows[0].user_id;

      // Get user details
      const userResult = await query(
        'SELECT id, email FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const user = userResult.rows[0];

      // Generate new tokens
      const newToken = generateToken({ id: user.id, email: user.email });
      const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email });

      // Revoke old refresh token and store new one
      await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1', [refreshToken]);
      await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
      );

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Placeholder for forgot password implementation
      res.json({
        success: true,
        message: 'Password reset instructions sent to email',
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Placeholder for reset password implementation
      res.json({
        success: true,
        message: 'Password reset successful',
      });
    } catch (error) {
      next(error);
    }
  }
}