import { Router, Request } from 'express';
import multer from 'multer';
import { authenticateUser } from '../../middleware/auth.middleware';
import { LeadsController } from './leads.controller';

const router = Router();

// Multer memory storage configuration (Max 10MB file size limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream',
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Only .csv, .xlsx, and .xls files are supported.'));
    }
  },
});

// All routes are protected by authenticateUser
router.use(authenticateUser);

// File Upload & Validation Routes
router.post('/upload-preview', upload.single('file'), LeadsController.uploadPreview);
router.post('/validate-mapping', upload.single('file'), LeadsController.validateMapping);
router.post('/import', LeadsController.importLeads);

// Import History Route
router.get('/imports/history', LeadsController.getImportHistory);

// Bulk Actions Route
router.post('/bulk-delete', LeadsController.bulkDelete);

// Standard Lead CRUD Routes
router.get('/', LeadsController.getLeads);
router.get('/:id', LeadsController.getLeadById);
router.post('/', LeadsController.createLead);
router.put('/:id', LeadsController.updateLead);
router.delete('/:id', LeadsController.deleteLead);

export default router;
