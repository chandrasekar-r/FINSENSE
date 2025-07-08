"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBudgetSchema = exports.createBudgetSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createBudgetSchema = joi_1.default.object({
    category_id: joi_1.default.string().uuid().required(),
    name: joi_1.default.string().min(1).max(255).required(),
    amount: joi_1.default.number().positive().required(),
    currency: joi_1.default.string().length(3).required(),
    period_type: joi_1.default.string().valid('monthly', 'weekly', 'yearly').required(),
    start_date: joi_1.default.date().required(),
    end_date: joi_1.default.date().optional(),
});
exports.updateBudgetSchema = joi_1.default.object({
    category_id: joi_1.default.string().uuid().optional(),
    name: joi_1.default.string().min(1).max(255).optional(),
    amount: joi_1.default.number().positive().optional(),
    currency: joi_1.default.string().length(3).optional(),
    period_type: joi_1.default.string().valid('monthly', 'weekly', 'yearly').optional(),
    start_date: joi_1.default.date().optional(),
    end_date: joi_1.default.date().optional(),
    is_active: joi_1.default.boolean().optional(),
});
//# sourceMappingURL=budgetValidators.js.map