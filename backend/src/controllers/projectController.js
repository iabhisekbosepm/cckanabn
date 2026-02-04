import { Project } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const projectController = {
  async getAll(req, res, next) {
    try {
      const projects = await Project.getAll();
      res.json(projects);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const project = await Project.getWithColumnsAndTasks(id);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      res.json(project);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { name, description, color } = req.body;
      const project = await Project.create({ name, description, color });
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;

      const existing = await Project.getById(id);
      if (!existing) {
        throw new NotFoundError('Project not found');
      }

      const project = await Project.update(id, { name, description, color });
      res.json(project);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await Project.getById(id);
      if (!existing) {
        throw new NotFoundError('Project not found');
      }

      await Project.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
};
