import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController.js';
import { Task } from '../models/index.js';

const router = Router();

router.get('/', dashboardController.getAll);

// Helper to extract date string (YYYY-MM-DD) from various formats
const extractDateString = (dateValue) => {
  if (!dateValue) return null;
  // If already a string in YYYY-MM-DD format
  if (typeof dateValue === 'string') {
    return dateValue.split('T')[0];
  }
  // If Date object, format as YYYY-MM-DD
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return null;
};

// Get all tasks data for heatmap
router.get('/heatmap', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    let tasks;
    if (startDate && endDate) {
      tasks = await Task.getTasksByDateRange(startDate, endDate);
    } else {
      tasks = await Task.getAllForHeatmap();
    }

    // Group tasks by due_date for the heatmap
    const tasksByDate = {};
    tasks.forEach(task => {
      const date = extractDateString(task.due_date);
      if (date) {
        if (!tasksByDate[date]) {
          tasksByDate[date] = [];
        }
        tasksByDate[date].push(task);
      }
    });

    // Also include tasks by created_at for workload view
    const tasksByCreated = {};
    tasks.forEach(task => {
      const date = extractDateString(task.created_at);
      if (date) {
        if (!tasksByCreated[date]) {
          tasksByCreated[date] = [];
        }
        tasksByCreated[date].push(task);
      }
    });

    res.json({
      tasks,
      byDueDate: tasksByDate,
      byCreatedDate: tasksByCreated,
      totalTasks: tasks.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
