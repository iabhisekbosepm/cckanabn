import { Column, Project } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const columnController = {
  async getByProject(req, res, next) {
    try {
      const { projectId } = req.params;

      const project = await Project.getById(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const columns = await Column.getByProjectId(projectId);
      res.json(columns);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { projectId } = req.params;
      const { name, color } = req.body;

      const project = await Project.getById(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const column = await Column.create({
        projectId,
        name,
        color
      });
      res.status(201).json(column);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, color } = req.body;

      const existing = await Column.getById(id);
      if (!existing) {
        throw new NotFoundError('Column not found');
      }

      const column = await Column.update(id, { name, color });
      res.json(column);
    } catch (error) {
      next(error);
    }
  },

  async reorder(req, res, next) {
    try {
      const { id } = req.params;
      const { position } = req.body;

      const existing = await Column.getById(id);
      if (!existing) {
        throw new NotFoundError('Column not found');
      }

      const column = await Column.reorder(id, position);
      res.json(column);
    } catch (error) {
      next(error);
    }
  },

  async reorderAll(req, res, next) {
    try {
      const { projectId } = req.params;
      const { columnIds } = req.body;

      const project = await Project.getById(projectId);
      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const columns = await Column.reorderAll(projectId, columnIds);
      res.json(columns);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await Column.getById(id);
      if (!existing) {
        throw new NotFoundError('Column not found');
      }

      await Column.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
