import { Router } from 'express';
import { Subtask, Task, Activity } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/tasks/:taskId/subtasks - Get all subtasks for a task
router.get('/tasks/:taskId/subtasks', async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.getById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const subtasks = await Subtask.getByTaskId(taskId);
    res.json(subtasks);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:taskId/subtasks - Create a subtask
router.post('/tasks/:taskId/subtasks', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title } = req.body;

    const task = await Task.getById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const subtask = await Subtask.create({
      taskId,
      title
    });

    // Log activity
    await Activity.log({ taskId, action: 'subtask_added', details: `Added subtask: "${title}"` });

    res.status(201).json(subtask);
  } catch (error) {
    next(error);
  }
});

// PUT /api/subtasks/:id - Update a subtask
router.put('/subtasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;

    const existing = await Subtask.getById(id);
    if (!existing) {
      throw new NotFoundError('Subtask not found');
    }

    const subtask = await Subtask.update(id, { title, completed });

    // Log activity for completion toggle
    if (completed !== undefined && completed !== existing.completed) {
      const action = completed ? 'subtask_completed' : 'subtask_uncompleted';
      const details = completed
        ? `Completed subtask: "${existing.title}"`
        : `Uncompleted subtask: "${existing.title}"`;
      await Activity.log({ taskId: existing.task_id, action, details });
    }

    res.json(subtask);
  } catch (error) {
    next(error);
  }
});

// PUT /api/subtasks/:id/toggle - Toggle subtask completion
router.put('/subtasks/:id/toggle', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Subtask.getById(id);
    if (!existing) {
      throw new NotFoundError('Subtask not found');
    }

    const subtask = await Subtask.toggle(id);

    // Log activity
    const action = subtask.completed ? 'subtask_completed' : 'subtask_uncompleted';
    const details = subtask.completed
      ? `Completed subtask: "${subtask.title}"`
      : `Uncompleted subtask: "${subtask.title}"`;
    await Activity.log({ taskId: existing.task_id, action, details });

    res.json(subtask);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/subtasks/:id - Delete a subtask
router.delete('/subtasks/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Subtask.getById(id);
    if (!existing) {
      throw new NotFoundError('Subtask not found');
    }

    await Subtask.delete(id);

    // Log activity
    await Activity.log({ taskId: existing.task_id, action: 'subtask_removed', details: `Removed subtask: "${existing.title}"` });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:taskId/subtasks/reorder - Reorder subtasks
router.put('/tasks/:taskId/subtasks/reorder', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { subtaskIds } = req.body;

    const task = await Task.getById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const subtasks = await Subtask.reorder(taskId, subtaskIds);
    res.json(subtasks);
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:taskId/subtasks/stats - Get subtask stats
router.get('/tasks/:taskId/subtasks/stats', async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.getById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const stats = await Subtask.getStats(taskId);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
