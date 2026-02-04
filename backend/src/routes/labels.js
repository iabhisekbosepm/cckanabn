import { Router } from 'express';
import { Label } from '../models/Label.js';

const router = Router();

// GET /api/labels - Get all labels
router.get('/', async (req, res, next) => {
  try {
    const labels = await Label.getAll();
    res.json(labels);
  } catch (error) {
    next(error);
  }
});

// POST /api/labels - Create a label
router.post('/', async (req, res, next) => {
  try {
    const { name, color } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Label name is required' });
    }
    const label = await Label.create({ name, color });
    res.status(201).json(label);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Label name already exists' });
    }
    next(error);
  }
});

// PUT /api/labels/:id - Update a label
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;
    const label = await Label.update(id, { name, color });
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json(label);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/labels/:id - Delete a label
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Label.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
