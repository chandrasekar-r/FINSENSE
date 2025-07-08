import { Router } from 'express';
import multer from 'multer';
import { ReceiptController } from '../controllers/ReceiptController';
import { authenticate } from '../middleware/auth';
import { getReceiptProgress } from '../services/ReceiptProcessingService';

const router = Router();
const receiptController = new ReceiptController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

router.use(authenticate as any);

router.post('/upload', upload.single('receipt'), (req, res, next) => receiptController.uploadReceipt(req as any, res, next));
router.get('/:id', (req, res, next) => receiptController.getReceiptData(req as any, res, next));
router.put('/:id/confirm', (req, res, next) => receiptController.confirmReceiptData(req as any, res, next));

router.get('/progress/:jobId', async (req, res) => {
  const { jobId } = req.params;
  if (!jobId) return res.status(400).json({ error: 'Missing jobId' });
  const progress = await getReceiptProgress(jobId);
  return res.json(progress);
});

export { router as receiptRoutes };