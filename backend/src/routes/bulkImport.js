import { Router } from 'express';
import { bulkImportController } from '../controllers/bulkImportController.js';

const router = Router();

// Preview what will be imported
router.post('/preview', bulkImportController.preview);

// Import tasks into a project
router.post('/projects/:projectId/import', bulkImportController.import);

export default router;
