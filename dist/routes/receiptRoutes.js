"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.receiptRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const ReceiptController_1 = require("../controllers/ReceiptController");
const auth_1 = require("../middleware/auth");
const ReceiptProcessingService_1 = require("../services/ReceiptProcessingService");
const router = (0, express_1.Router)();
exports.receiptRoutes = router;
const receiptController = new ReceiptController_1.ReceiptController();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
        }
    },
});
router.use(auth_1.authenticate);
router.post('/upload', upload.single('receipt'), (req, res, next) => receiptController.uploadReceipt(req, res, next));
router.get('/:id', (req, res, next) => receiptController.getReceiptData(req, res, next));
router.put('/:id/confirm', (req, res, next) => receiptController.confirmReceiptData(req, res, next));
router.get('/progress/:jobId', async (req, res) => {
    const { jobId } = req.params;
    if (!jobId)
        return res.status(400).json({ error: 'Missing jobId' });
    const progress = await (0, ReceiptProcessingService_1.getReceiptProgress)(jobId);
    return res.json(progress);
});
//# sourceMappingURL=receiptRoutes.js.map