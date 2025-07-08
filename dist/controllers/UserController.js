"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class UserController {
    async getProfile(req, res, next) {
        try {
            const userId = req.user?.id;
            const userResult = await (0, database_1.query)(`SELECT id, email, first_name, last_name, default_currency, 
                created_at, is_active, email_verified 
         FROM users WHERE id = $1`, [userId]);
            if (userResult.rows.length === 0) {
                throw (0, errorHandler_1.createError)('User not found', 404);
            }
            res.json({
                success: true,
                data: userResult.rows[0],
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateProfile(req, res, next) {
        try {
            const userId = req.user?.id;
            const updates = req.body;
            const fields = [];
            const values = [];
            let paramCount = 1;
            if (updates.first_name !== undefined) {
                fields.push(`first_name = $${paramCount++}`);
                values.push(updates.first_name);
            }
            if (updates.last_name !== undefined) {
                fields.push(`last_name = $${paramCount++}`);
                values.push(updates.last_name);
            }
            if (updates.default_currency !== undefined) {
                fields.push(`default_currency = $${paramCount++}`);
                values.push(updates.default_currency);
            }
            if (fields.length === 0) {
                throw (0, errorHandler_1.createError)('No valid fields to update', 400);
            }
            fields.push(`updated_at = NOW()`);
            values.push(userId);
            const updateQuery = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING id, email, first_name, last_name, default_currency, created_at, updated_at, is_active, email_verified
      `;
            const result = await (0, database_1.query)(updateQuery, values);
            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: result.rows[0],
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteAccount(req, res, next) {
        try {
            const userId = req.user?.id;
            await (0, database_1.query)('UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1', [userId]);
            res.json({
                success: true,
                message: 'Account deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSettings(req, res, next) {
        try {
            const userId = req.user?.id;
            const settingsResult = await (0, database_1.query)('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
            if (settingsResult.rows.length === 0) {
                const defaultSettings = await (0, database_1.query)(`INSERT INTO user_settings (user_id, default_currency) 
           VALUES ($1, 'USD') 
           RETURNING *`, [userId]);
                res.json({
                    success: true,
                    data: defaultSettings.rows[0],
                });
            }
            else {
                res.json({
                    success: true,
                    data: settingsResult.rows[0],
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
    async updateSettings(req, res, next) {
        try {
            const userId = req.user?.id;
            const { default_currency, date_format, timezone, notification_preferences } = req.body;
            const fields = [];
            const values = [];
            let paramCount = 1;
            if (default_currency !== undefined) {
                fields.push(`default_currency = $${paramCount++}`);
                values.push(default_currency);
            }
            if (date_format !== undefined) {
                fields.push(`date_format = $${paramCount++}`);
                values.push(date_format);
            }
            if (timezone !== undefined) {
                fields.push(`timezone = $${paramCount++}`);
                values.push(timezone);
            }
            if (notification_preferences !== undefined) {
                fields.push(`notification_preferences = $${paramCount++}`);
                values.push(JSON.stringify(notification_preferences));
            }
            if (fields.length === 0) {
                throw (0, errorHandler_1.createError)('No valid fields to update', 400);
            }
            fields.push(`updated_at = NOW()`);
            values.push(userId);
            const updateQuery = `
        UPDATE user_settings 
        SET ${fields.join(', ')} 
        WHERE user_id = $${paramCount} 
        RETURNING *
      `;
            const result = await (0, database_1.query)(updateQuery, values);
            res.json({
                success: true,
                message: 'Settings updated successfully',
                data: result.rows[0],
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map