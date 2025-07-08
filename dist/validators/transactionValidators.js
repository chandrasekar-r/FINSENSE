"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTransactionSchema = exports.createTransactionSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createTransactionSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().required(),
    description: joi_1.default.string().min(1).max(500).required(),
    category_id: joi_1.default.alternatives().try(joi_1.default.string().uuid(), joi_1.default.string().min(1).max(255)).required(),
    transaction_type: joi_1.default.string().valid('income', 'expense').optional().default('expense'),
    transaction_date: joi_1.default.string().isoDate().optional(),
    vendor_name: joi_1.default.string().min(1).max(255).optional().allow('', null),
    merchant_name: joi_1.default.string().min(1).max(255).optional().allow('', null),
    currency: joi_1.default.string().length(3).optional().default('USD'),
    tax_amount: joi_1.default.number().min(0).optional(),
}).options({ allowUnknown: true, stripUnknown: true });
exports.updateTransactionSchema = joi_1.default.object({
    amount: joi_1.default.number().positive().optional(),
    description: joi_1.default.string().min(1).max(500).optional(),
    category_id: joi_1.default.string().uuid().optional(),
    transaction_type: joi_1.default.string().valid('income', 'expense').optional(),
    transaction_date: joi_1.default.string().isoDate().optional(),
    vendor_name: joi_1.default.string().min(1).max(255).optional().allow(''),
    merchant_name: joi_1.default.string().min(1).max(255).optional().allow(''),
    currency: joi_1.default.string().length(3).optional(),
    tax_amount: joi_1.default.number().min(0).optional(),
});
//# sourceMappingURL=transactionValidators.js.map