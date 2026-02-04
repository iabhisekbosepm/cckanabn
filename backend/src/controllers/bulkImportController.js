import { parseTasksText } from '../utils/taskParser.js';
import { Project, Column, Task } from '../models/index.js';
import { NotFoundError } from '../middleware/errorHandler.js';
import { getDb } from '../config/database.js';

export const bulkImportController = {
  /**
   * Preview what will be imported without actually importing
   */
  preview(req, res) {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const parsed = parseTasksText(text);
    const columns = Object.keys(parsed);
    const taskCount = Object.values(parsed).reduce((sum, tasks) => sum + tasks.length, 0);

    res.json({
      columns,
      taskCount,
      parsed
    });
  },

  /**
   * Import tasks from parsed text into a project
   */
  import(req, res) {
    const { projectId } = req.params;
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const project = Project.getById(Number(projectId));
    if (!project) {
      throw new NotFoundError('Project not found');
    }

    const parsed = parseTasksText(text);
    const existingColumns = Column.getByProjectId(Number(projectId));

    // Create a map of existing columns by name (case-insensitive)
    const columnMap = {};
    existingColumns.forEach(col => {
      columnMap[col.name.toLowerCase()] = col;
    });

    const db = getDb();
    const results = {
      columnsCreated: 0,
      tasksCreated: 0,
      details: []
    };

    // Use a transaction for atomicity
    const importAll = db.transaction(() => {
      for (const [columnName, tasks] of Object.entries(parsed)) {
        let column = columnMap[columnName.toLowerCase()];

        // Create column if it doesn't exist
        if (!column) {
          column = Column.create({
            projectId: Number(projectId),
            name: columnName
          });
          columnMap[columnName.toLowerCase()] = column;
          results.columnsCreated++;
        }

        // Create tasks in the column
        for (const task of tasks) {
          Task.create({
            columnId: column.id,
            title: task.title,
            description: task.description || null,
            priority: task.priority || 'medium'
          });
          results.tasksCreated++;
        }

        results.details.push({
          column: columnName,
          columnId: column.id,
          tasksAdded: tasks.length
        });
      }
    });

    importAll();

    res.status(201).json({
      message: 'Import successful',
      ...results
    });
  }
};
