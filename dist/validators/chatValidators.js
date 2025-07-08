"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatQuerySchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.chatQuerySchema = joi_1.default.object({
    message: joi_1.default.string().min(1).max(1000).required().messages({
        'string.min': 'Message cannot be empty',
        'string.max': 'Message must not exceed 1000 characters',
        'any.required': 'Message is required',
    }),
});
//# sourceMappingURL=chatValidators.js.map