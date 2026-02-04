import { Router } from 'express';
import { columnController } from '../controllers/columnController.js';

const router = Router();

// Routes with projectId
router.get('/projects/:projectId/columns', columnController.getByProject);
router.post('/projects/:projectId/columns', columnController.create);
router.put('/projects/:projectId/columns/reorder', columnController.reorderAll);

// Routes with column id
router.put('/columns/:id', columnController.update);
router.put('/columns/:id/reorder', columnController.reorder);
router.delete('/columns/:id', columnController.delete);

export default router;
