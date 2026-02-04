import { Router } from 'express';
import projectRoutes from './projects.js';
import columnRoutes from './columns.js';
import taskRoutes from './tasks.js';
import dashboardRoutes from './dashboard.js';
import bulkImportRoutes from './bulkImport.js';
import labelRoutes from './labels.js';
import chatRoutes from './chat.js';
import notesRoutes from './notes.js';
import subtaskRoutes from './subtasks.js';
import attachmentRoutes from './attachments.js';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/', columnRoutes);
router.use('/', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/', bulkImportRoutes);
router.use('/labels', labelRoutes);
router.use('/chat', chatRoutes);
router.use('/', notesRoutes);
router.use('/', subtaskRoutes);
router.use('/', attachmentRoutes);

export default router;
