import { Router } from 'express';
import { taskController } from '../controllers/taskController.js';

const router = Router();

// Routes with columnId
router.get('/columns/:columnId/tasks', taskController.getByColumn);
router.post('/columns/:columnId/tasks', taskController.create);
router.put('/columns/:columnId/tasks/reorder', taskController.reorder);

// Routes with task id
router.get('/tasks/:id', taskController.getById);
router.put('/tasks/:id', taskController.update);
router.put('/tasks/:id/move', taskController.move);
router.delete('/tasks/:id', taskController.delete);

// Label management
router.post('/tasks/:id/labels/:labelId', taskController.addLabel);
router.delete('/tasks/:id/labels/:labelId', taskController.removeLabel);

export default router;
