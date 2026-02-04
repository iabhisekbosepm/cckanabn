import { Router } from 'express';
import { Note, Activity } from '../models/index.js';

const router = Router();

// Get all notes for a task
router.get('/tasks/:taskId/notes', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const notes = await Note.getByTaskId(taskId);
    res.json(notes);
  } catch (error) {
    next(error);
  }
});

// Get activity log for a task
router.get('/tasks/:taskId/activity', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const activity = await Activity.getByTaskId(taskId, limit);
    res.json(activity);
  } catch (error) {
    next(error);
  }
});

// Create a note
router.post('/tasks/:taskId/notes', async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content, author } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = await Note.create({ taskId, content: content.trim(), author });

    // Log activity
    await Activity.logNoteAdded(taskId, author || 'User');

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
});

// Update a note
router.put('/notes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = await Note.getById(id);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updatedNote = await Note.update(id, { content: content.trim() });
    res.json(updatedNote);
  } catch (error) {
    next(error);
  }
});

// Delete a note
router.delete('/notes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const note = await Note.getById(id);

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await Note.delete(id);

    // Log activity
    await Activity.logNoteDeleted(note.task_id, 'User');

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
