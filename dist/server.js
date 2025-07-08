"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const notFoundHandler_1 = require("./middleware/notFoundHandler");
const authRoutes_1 = require("./routes/authRoutes");
const userRoutes_1 = require("./routes/userRoutes");
const transactionRoutes_1 = require("./routes/transactionRoutes");
const budgetRoutes_1 = require("./routes/budgetRoutes");
const receiptRoutes_1 = require("./routes/receiptRoutes");
const chatRoutes_1 = require("./routes/chatRoutes");
const categoryRoutes_1 = require("./routes/categoryRoutes");
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_1.logger.info(message.trim()) } }));
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes_1.authRoutes);
app.use('/api/users', userRoutes_1.userRoutes);
app.use('/api/transactions', transactionRoutes_1.transactionRoutes);
app.use('/api/budgets', budgetRoutes_1.budgetRoutes);
app.use('/api/receipts', receiptRoutes_1.receiptRoutes);
app.use('/api/chat', chatRoutes_1.chatRoutes);
app.use('/api/categories', categoryRoutes_1.categoryRoutes);
app.use(notFoundHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
async function startServer() {
    try {
        await (0, database_1.initializeDatabase)();
        app.listen(PORT, '0.0.0.0', () => {
            logger_1.logger.info(`Server running on port ${PORT}`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
exports.default = app;
//# sourceMappingURL=server.js.map