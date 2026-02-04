import { Project } from '../models/index.js';

export const dashboardController = {
  async getAll(req, res, next) {
    try {
      const projects = await Project.getAll();

      // Get full data for each project
      const projectsWithData = await Promise.all(
        projects.map(project => Project.getWithColumnsAndTasks(project.id))
      );

      res.json({ projects: projectsWithData });
    } catch (error) {
      next(error);
    }
  }
};
