import { Task, Column, Activity } from '../models/index.js';
import { Label } from '../models/Label.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const taskController = {
  async getByColumn(req, res, next) {
    try {
      const { columnId } = req.params;

      const column = await Column.getById(columnId);
      if (!column) {
        throw new NotFoundError('Column not found');
      }

      const tasks = await Task.getByColumnId(columnId);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const task = await Task.getById(id);

      if (!task) {
        throw new NotFoundError('Task not found');
      }

      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { columnId } = req.params;
      const { title, description, priority, dueDate, labelIds } = req.body;

      const column = await Column.getById(columnId);
      if (!column) {
        throw new NotFoundError('Column not found');
      }

      const task = await Task.create({
        columnId,
        title,
        description,
        priority,
        dueDate
      });

      // Set labels if provided
      if (labelIds && Array.isArray(labelIds)) {
        await Label.setTaskLabels(task.id, labelIds);
      }

      // Log activity
      await Activity.logCreated(task.id);

      // Get task with labels
      const taskWithLabels = await Task.getById(task.id);
      res.status(201).json(taskWithLabels);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, priority, dueDate, labelIds } = req.body;

      const existing = await Task.getById(id);
      if (!existing) {
        throw new NotFoundError('Task not found');
      }

      // Track changes for activity log
      const changes = [];
      if (title !== undefined && title !== existing.title) {
        changes.push(`Title changed to "${title}"`);
      }
      if (description !== undefined && description !== existing.description) {
        changes.push('Description updated');
      }
      if (priority !== undefined && priority !== existing.priority) {
        await Activity.logPriorityChanged(id, existing.priority, priority);
      }
      if (dueDate !== undefined && dueDate !== existing.due_date) {
        await Activity.logDueDateChanged(id, existing.due_date, dueDate);
      }

      await Task.update(id, { title, description, priority, dueDate });

      // Update labels if provided
      if (labelIds !== undefined) {
        await Label.setTaskLabels(id, labelIds || []);
      }

      // Log general update if there were title/description changes
      if (changes.length > 0) {
        await Activity.logUpdated(id, changes.join('; '));
      }

      const task = await Task.getById(id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async move(req, res, next) {
    try {
      const { id } = req.params;
      const { columnId, position } = req.body;

      const existing = await Task.getById(id);
      if (!existing) {
        throw new NotFoundError('Task not found');
      }

      const oldColumn = await Column.getById(existing.column_id);
      const newColumn = await Column.getById(columnId);
      if (!newColumn) {
        throw new NotFoundError('Target column not found');
      }

      await Task.move(id, { columnId, position });

      // Log activity if moved to different column
      if (existing.column_id.toString() !== columnId.toString()) {
        await Activity.logMoved(id, oldColumn?.name || 'Unknown', newColumn.name);
      }

      const task = await Task.getById(id);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async reorder(req, res, next) {
    try {
      const { columnId } = req.params;
      const { taskIds } = req.body;

      const column = await Column.getById(columnId);
      if (!column) {
        throw new NotFoundError('Column not found');
      }

      const tasks = await Task.reorderInColumn(columnId, taskIds);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await Task.getById(id);
      if (!existing) {
        throw new NotFoundError('Task not found');
      }

      await Task.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async addLabel(req, res, next) {
    try {
      const { id, labelId } = req.params;

      const task = await Task.getById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      const label = await Label.getById(labelId);
      if (!label) {
        throw new NotFoundError('Label not found');
      }

      await Label.addToTask(id, labelId);

      // Log activity
      await Activity.logLabelAdded(id, label.name);

      const updatedTask = await Task.getById(id);
      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  },

  async removeLabel(req, res, next) {
    try {
      const { id, labelId } = req.params;

      const task = await Task.getById(id);
      if (!task) {
        throw new NotFoundError('Task not found');
      }

      const label = await Label.getById(labelId);
      if (!label) {
        throw new NotFoundError('Label not found');
      }

      await Label.removeFromTask(id, labelId);

      // Log activity
      await Activity.logLabelRemoved(id, label.name);

      const updatedTask = await Task.getById(id);
      res.json(updatedTask);
    } catch (error) {
      next(error);
    }
  }
};
