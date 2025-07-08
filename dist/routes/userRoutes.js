"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const userValidators_1 = require("../validators/userValidators");
const router = (0, express_1.Router)();
exports.userRoutes = router;
const userController = new UserController_1.UserController();
router.use(auth_1.authenticate);
router.get('/profile', (req, res, next) => userController.getProfile(req, res, next));
router.put('/profile', (0, validate_1.validate)(userValidators_1.updateUserSchema), (req, res, next) => userController.updateProfile(req, res, next));
router.delete('/profile', (req, res, next) => userController.deleteAccount(req, res, next));
router.get('/settings', (req, res, next) => userController.getSettings(req, res, next));
router.put('/settings', (req, res, next) => userController.updateSettings(req, res, next));
//# sourceMappingURL=userRoutes.js.map