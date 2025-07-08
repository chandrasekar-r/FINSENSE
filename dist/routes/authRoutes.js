"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const validate_1 = require("../middleware/validate");
const authValidators_1 = require("../validators/authValidators");
const router = (0, express_1.Router)();
exports.authRoutes = router;
const authController = new AuthController_1.AuthController();
router.post('/register', (0, validate_1.validate)(authValidators_1.registerSchema), authController.register);
router.post('/login', (0, validate_1.validate)(authValidators_1.loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
//# sourceMappingURL=authRoutes.js.map