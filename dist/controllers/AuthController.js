"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const database_1 = require("../config/database");
const password_1 = require("../utils/password");
const jwt_1 = require("../utils/jwt");
const errorHandler_1 = require("../middleware/errorHandler");
class AuthController {
    async register(req, res, next) {
        try {
            const { email, password, first_name, last_name, default_currency = 'USD' } = req.body;
            const existingUser = await (0, database_1.query)('SELECT id FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                throw (0, errorHandler_1.createError)('Email already registered', 409);
            }
            const passwordHash = await (0, password_1.hashPassword)(password);
            const userResult = await (0, database_1.query)(`INSERT INTO users (email, password_hash, first_name, last_name, default_currency) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, email, first_name, last_name, default_currency, created_at, is_active, email_verified`, [email, passwordHash, first_name, last_name, default_currency]);
            const user = userResult.rows[0];
            await (0, database_1.query)('INSERT INTO user_settings (user_id, default_currency) VALUES ($1, $2)', [user.id, default_currency]);
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
                await (0, database_1.query)('INSERT INTO categories (user_id, name, color, icon, is_default) VALUES ($1, $2, $3, $4, $5)', [user.id, category.name, category.color, category.icon, true]);
            }
            const token = (0, jwt_1.generateToken)({ id: user.id, email: user.email });
            const refreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id, email: user.email });
            await (0, database_1.query)('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                data: {
                    user,
                    token,
                    refreshToken,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const userResult = await (0, database_1.query)(`SELECT id, email, password_hash, first_name, last_name, default_currency, 
                created_at, is_active, email_verified 
         FROM users WHERE email = $1 AND is_active = true`, [email]);
            if (userResult.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Invalid email or password', 401);
            }
            const user = userResult.rows[0];
            const isValidPassword = await (0, password_1.comparePassword)(password, user.password_hash);
            if (!isValidPassword) {
                throw (0, errorHandler_1.createError)('Invalid email or password', 401);
            }
            const token = (0, jwt_1.generateToken)({ id: user.id, email: user.email });
            const refreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id, email: user.email });
            await (0, database_1.query)('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
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
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            res.json({
                success: true,
                message: 'Logout successful',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                throw (0, errorHandler_1.createError)('Refresh token is required', 400);
            }
            const tokenResult = await (0, database_1.query)('SELECT user_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW() AND revoked_at IS NULL', [refreshToken]);
            if (tokenResult.rows.length === 0) {
                throw (0, errorHandler_1.createError)('Invalid or expired refresh token', 401);
            }
            const userId = tokenResult.rows[0].user_id;
            const userResult = await (0, database_1.query)('SELECT id, email FROM users WHERE id = $1 AND is_active = true', [userId]);
            if (userResult.rows.length === 0) {
                throw (0, errorHandler_1.createError)('User not found', 404);
            }
            const user = userResult.rows[0];
            const newToken = (0, jwt_1.generateToken)({ id: user.id, email: user.email });
            const newRefreshToken = (0, jwt_1.generateRefreshToken)({ id: user.id, email: user.email });
            await (0, database_1.query)('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = $1', [refreshToken]);
            await (0, database_1.query)('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)', [user.id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
            res.json({
                success: true,
                data: {
                    token: newToken,
                    refreshToken: newRefreshToken,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            res.json({
                success: true,
                message: 'Password reset instructions sent to email',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            res.json({
                success: true,
                message: 'Password reset successful',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map