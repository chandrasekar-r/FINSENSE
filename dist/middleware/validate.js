"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const errorHandler_1 = require("./errorHandler");
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            allowUnknown: true,
            stripUnknown: false
        });
        if (error) {
            console.error('Validation error:', error.details);
            console.error('Request body:', req.body);
            const messages = error.details.map(detail => detail.message).join(', ');
            throw (0, errorHandler_1.createError)(messages, 400);
        }
        req.body = value;
        next();
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map