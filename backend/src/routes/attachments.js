import { Router } from 'express';
import { Attachment, Task, Activity } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';

const router = Router();

// GET /api/tasks/:taskId/attachments - Get all attachments for a task
router.get('/tasks/:taskId/attachments', async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.getById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    const attachments = await Attachment.getByTaskId(taskId);
    res.json(attachments);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:taskId/attachments - Create an attachment
router.post('/tasks/:taskId/attachments', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { title, url } = req.body;

    const task = await Task.getById(taskId);
    if (!task) {
      throw new NotFoundError('Task not found');
    }

    // Auto-detect type from URL
    const type = Attachment.detectType(url);

    const attachment = await Attachment.create({
      taskId,
      title,
      url,
      type
    });

    // Log activity
    await Activity.log({ taskId, action: 'attachment_added', details: `Added attachment: "${title}"` });

    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
});

// PUT /api/attachments/:id - Update an attachment
router.put('/attachments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;

    const existing = await Attachment.getById(id);
    if (!existing) {
      throw new NotFoundError('Attachment not found');
    }

    const attachment = await Attachment.update(id, { title, url });
    res.json(attachment);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/attachments/:id - Delete an attachment
router.delete('/attachments/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await Attachment.getById(id);
    if (!existing) {
      throw new NotFoundError('Attachment not found');
    }

    await Attachment.delete(id);

    // Log activity
    await Activity.log({ taskId: existing.task_id, action: 'attachment_removed', details: `Removed attachment: "${existing.title}"` });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
