import { getDb } from '../config/database.js';
import { Task } from '../models/Task.js';
import { Column } from '../models/Column.js';
import { Project } from '../models/Project.js';
import { Label } from '../models/Label.js';
import { Activity } from '../models/Activity.js';

/**
 * Enhanced AI Chat Service - Intelligent natural language processing for task management
 * Uses semantic understanding and fuzzy matching for better query comprehension
 */

// ================== UTILITY FUNCTIONS ==================

// Normalize text for comparison
function normalize(text) {
  return (text || '').toLowerCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
}

// Calculate similarity between two strings (simple Levenshtein-based)
function similarity(str1, str2) {
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w));

  return commonWords.length / Math.max(words1.length, words2.length);
}

// Find best match from a list
function findBestMatch(query, items, keyFn = (x) => x.name) {
  const normalizedQuery = normalize(query);
  let bestMatch = null;
  let bestScore = 0;

  for (const item of items) {
    const itemName = normalize(keyFn(item));

    // Exact match
    if (itemName === normalizedQuery) {
      return { item, score: 1 };
    }

    // Contains match
    if (itemName.includes(normalizedQuery) || normalizedQuery.includes(itemName)) {
      const score = 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
      continue;
    }

    // Word-based match
    const score = similarity(itemName, normalizedQuery);
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch ? { item: bestMatch, score: bestScore } : null;
}

// ================== DATABASE HELPERS ==================

function getAllProjects() {
  return Project.getAll();
}

function getAllColumns() {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, p.name as project_name
    FROM columns c
    JOIN projects p ON c.project_id = p.id
    ORDER BY p.name, c.position
  `).all();
}

function getAllLabels() {
  return Label.getAll();
}

function getAllTasks() {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as column_name, c.id as column_id, p.name as project_name, p.id as project_id
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN projects p ON c.project_id = p.id
    ORDER BY t.created_at DESC
  `).all();
}

function getTasksInColumn(columnId) {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as column_name, c.id as column_id, p.name as project_name, p.id as project_id
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN projects p ON c.project_id = p.id
    WHERE t.column_id = ?
  `).all(columnId);
}

function getTasksInProject(projectId) {
  const db = getDb();
  return db.prepare(`
    SELECT t.*, c.name as column_name, c.id as column_id, p.name as project_name, p.id as project_id
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN projects p ON c.project_id = p.id
    WHERE p.id = ?
  `).all(projectId);
}

function searchTasks(criteria) {
  const db = getDb();
  let query = `
    SELECT DISTINCT t.*, c.name as column_name, c.id as column_id, p.name as project_name, p.id as project_id
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN projects p ON c.project_id = p.id
  `;

  const conditions = [];
  const params = [];

  if (criteria.labelName) {
    query += ` JOIN task_labels tl ON t.id = tl.task_id JOIN labels l ON tl.label_id = l.id`;
    conditions.push(`LOWER(l.name) = LOWER(?)`);
    params.push(criteria.labelName);
  }

  if (criteria.priority) {
    conditions.push(`t.priority = ?`);
    params.push(criteria.priority.toLowerCase());
  }

  if (criteria.projectId) {
    conditions.push(`p.id = ?`);
    params.push(criteria.projectId);
  }

  if (criteria.columnId) {
    conditions.push(`c.id = ?`);
    params.push(criteria.columnId);
  }

  if (criteria.overdue) {
    conditions.push(`t.due_date < date('now') AND t.due_date IS NOT NULL`);
  }

  if (criteria.dueToday) {
    conditions.push(`t.due_date = date('now')`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY t.created_at DESC LIMIT 50`;

  return db.prepare(query).all(...params);
}

// ================== ENTITY EXTRACTION ==================

function extractEntities(message) {
  const normalized = normalize(message);
  const entities = {
    projects: [],
    columns: [],
    labels: [],
    tasks: [],
    priorities: [],
    rawMessage: message
  };

  // Extract priorities
  const priorityMatch = normalized.match(/\b(high|medium|low)\s*priority\b/i) ||
                        normalized.match(/\bpriority\s*(high|medium|low)\b/i);
  if (priorityMatch) {
    entities.priorities.push(priorityMatch[1].toLowerCase());
  }

  // Get all available entities from database
  const allProjects = getAllProjects();
  const allColumns = getAllColumns();
  const allLabels = getAllLabels();
  const allTasks = getAllTasks();

  // Find mentioned projects
  for (const project of allProjects) {
    if (normalized.includes(normalize(project.name))) {
      entities.projects.push(project);
    }
  }

  // Find mentioned columns
  for (const column of allColumns) {
    const colName = normalize(column.name);
    // Check if column name appears in message (with some context clues)
    if (normalized.includes(colName) ||
        normalized.includes(`in ${colName}`) ||
        normalized.includes(`${colName} column`) ||
        normalized.includes(`to ${colName}`)) {
      // If we have a project context, filter by it
      if (entities.projects.length > 0) {
        if (entities.projects.some(p => p.id === column.project_id)) {
          entities.columns.push(column);
        }
      } else {
        entities.columns.push(column);
      }
    }
  }

  // Find mentioned labels
  for (const label of allLabels) {
    const labelName = normalize(label.name);
    if (normalized.includes(labelName) ||
        normalized.includes(`tag ${labelName}`) ||
        normalized.includes(`label ${labelName}`) ||
        normalized.includes(`${labelName} tag`) ||
        normalized.includes(`${labelName} label`)) {
      entities.labels.push(label);
    }
  }

  // Find mentioned tasks (by exact or partial title match)
  for (const task of allTasks) {
    const taskTitle = normalize(task.title);
    if (normalized.includes(taskTitle)) {
      entities.tasks.push(task);
    }
  }

  return entities;
}

// ================== ACTION DETECTION ==================

const ACTION_KEYWORDS = {
  CREATE: ['create', 'add', 'new', 'make', 'insert'],
  DELETE: ['delete', 'remove', 'trash', 'eliminate', 'drop'],
  MOVE: ['move', 'transfer', 'relocate', 'shift', 'put'],
  UPDATE: ['update', 'change', 'modify', 'edit', 'set'],
  ADD_TAG: ['tag', 'label', 'add tag', 'add label', 'attach'],
  REMOVE_TAG: ['untag', 'remove tag', 'remove label', 'detach'],
  SEARCH: ['show', 'list', 'find', 'get', 'search', 'display', 'view', 'what'],
  MARK_DONE: ['done', 'complete', 'finish', 'close', 'resolve'],
  HELP: ['help', 'how', 'what can', 'commands'],
  INFO: ['info', 'summary', 'stats', 'statistics', 'status', 'how many']
};

function detectAction(message) {
  const normalized = normalize(message);

  // Priority-based action detection (more specific patterns first)

  // Check for prepend/append title operations (before other 'add' operations)
  if (normalized.includes('before all') || normalized.includes('prepend') ||
      normalized.includes('prefix') || normalized.includes('add before') ||
      (normalized.includes('before') && normalized.includes('task') && normalized.includes('add'))) {
    return 'PREPEND_TITLE';
  }

  if (normalized.includes('after all') || normalized.includes('append') ||
      normalized.includes('suffix') || normalized.includes('add after') ||
      (normalized.includes('after') && normalized.includes('task') && normalized.includes('add'))) {
    return 'APPEND_TITLE';
  }

  // Check for rename/update title
  if (normalized.includes('rename') ||
      (normalized.includes('change') && normalized.includes('title')) ||
      (normalized.includes('update') && normalized.includes('title'))) {
    return 'RENAME_TITLE';
  }

  // Check for tag/label operations first (before 'add' which could be CREATE)
  if ((normalized.includes('tag') || normalized.includes('label')) &&
      !normalized.includes('remove tag') && !normalized.includes('remove label') &&
      !normalized.includes('untag') && !normalized.includes('detach')) {
    return 'ADD_TAG';
  }

  if (normalized.includes('remove tag') || normalized.includes('remove label') ||
      normalized.includes('untag') || normalized.includes('detach label')) {
    return 'REMOVE_TAG';
  }

  // Check for mark as done/complete
  if ((normalized.includes('mark') && (normalized.includes('done') || normalized.includes('complete'))) ||
      normalized.includes('finish task')) {
    return 'MARK_DONE';
  }

  // Check for move operations
  if (normalized.includes('move') || normalized.includes('transfer') || normalized.includes('relocate')) {
    return 'MOVE';
  }

  // Check for delete operations
  if (normalized.includes('delete') || normalized.includes('remove task') ||
      normalized.includes('trash') || normalized.includes('eliminate')) {
    return 'DELETE';
  }

  // Check for create operations (only if not tag/label related)
  if ((normalized.includes('create') || normalized.includes('new task') ||
       normalized.includes('add task') || normalized.includes('make task')) &&
      !normalized.includes('tag') && !normalized.includes('label')) {
    return 'CREATE';
  }

  // Check for update operations
  if (normalized.includes('update') || normalized.includes('change') ||
      normalized.includes('modify') || normalized.includes('set priority')) {
    return 'UPDATE';
  }

  // Check for search/list operations
  if (normalized.includes('show') || normalized.includes('list') ||
      normalized.includes('find') || normalized.includes('search') ||
      normalized.includes('display') || normalized.includes('view') ||
      normalized.includes('what') || normalized.includes('get')) {
    return 'SEARCH';
  }

  // Check for info operations
  if (normalized.includes('info') || normalized.includes('summary') ||
      normalized.includes('stats') || normalized.includes('statistics') ||
      normalized.includes('status') || normalized.includes('how many')) {
    return 'INFO';
  }

  // Check for help
  if (normalized.includes('help') || normalized.includes('what can') ||
      normalized.includes('commands')) {
    return 'HELP';
  }

  return 'UNKNOWN';
}

// ================== BULK OPERATIONS ==================

function detectBulkOperation(message) {
  const normalized = normalize(message);

  // Check for bulk indicators
  const bulkIndicators = ['all', 'every', 'each', 'multiple', 'batch', 'bulk'];

  for (const indicator of bulkIndicators) {
    if (normalized.includes(indicator)) {
      return true;
    }
  }

  return false;
}

// ================== RESPONSE FORMATTERS ==================

function formatTask(task) {
  const labels = Label.getByTaskId(task.id);
  const labelText = labels.length > 0 ? ` [${labels.map(l => l.name).join(', ')}]` : '';
  const dueText = task.due_date ? ` (Due: ${task.due_date})` : '';
  return `• "${task.title}" in ${task.column_name} (${task.project_name})${labelText}${dueText} - ${task.priority} priority`;
}

function formatTaskList(tasks, title = 'Tasks') {
  if (tasks.length === 0) {
    return `No ${title.toLowerCase()} found.`;
  }

  const taskLines = tasks.slice(0, 15).map(formatTask);
  let response = `**${title}** (${tasks.length} found):\n\n${taskLines.join('\n')}`;

  if (tasks.length > 15) {
    response += `\n\n...and ${tasks.length - 15} more.`;
  }

  return response;
}

// ================== COMMAND HANDLERS ==================

async function handleAddLabel(entities, message) {
  const normalized = normalize(message);
  const isBulk = detectBulkOperation(message);

  // Extract label name from message if not found in entities
  let labelToAdd = entities.labels[0];

  // Try to extract label name from patterns like "add tag Bug" or "tag- Bug"
  if (!labelToAdd) {
    const labelPatterns = [
      /add\s+(?:tag|label)\s*[-:]?\s*(\w+)/i,
      /tag\s*[-:]?\s*(\w+)/i,
      /label\s*[-:]?\s*(\w+)/i,
      /with\s+(?:tag|label)\s*(\w+)/i
    ];

    for (const pattern of labelPatterns) {
      const match = message.match(pattern);
      if (match) {
        const labelName = match[1].trim();
        // Check if this label exists or create reference
        let existingLabel = Label.getByName(labelName);
        if (!existingLabel) {
          existingLabel = Label.create({ name: labelName, color: '#6B7280' });
        }
        labelToAdd = existingLabel;
        break;
      }
    }
  }

  if (!labelToAdd) {
    return {
      success: false,
      message: `Please specify a label name. Example: "Add tag Bug to all tasks in To Do"`
    };
  }

  // Determine which tasks to tag
  let tasksToTag = [];

  if (isBulk) {
    // Bulk operation - find tasks based on column/project context
    if (entities.columns.length > 0) {
      for (const col of entities.columns) {
        tasksToTag.push(...getTasksInColumn(col.id));
      }
    } else if (entities.projects.length > 0) {
      for (const proj of entities.projects) {
        tasksToTag.push(...getTasksInProject(proj.id));
      }
    } else {
      // Default to all tasks if no specific context
      tasksToTag = getAllTasks();
    }
  } else if (entities.tasks.length > 0) {
    tasksToTag = entities.tasks;
  } else {
    // Try to find task by searching remaining text
    const allTasks = getAllTasks();
    const taskMatch = findBestMatch(message, allTasks, t => t.title);
    if (taskMatch) {
      tasksToTag = [taskMatch.item];
    }
  }

  if (tasksToTag.length === 0) {
    return {
      success: false,
      message: `No tasks found to add the label to. Please specify a task or column.`
    };
  }

  // Add label to tasks
  let addedCount = 0;
  for (const task of tasksToTag) {
    Label.addToTask(task.id, labelToAdd.id);
    Activity.logLabelAdded(task.id, labelToAdd.name);
    addedCount++;
  }

  const contextInfo = entities.columns.length > 0
    ? ` in "${entities.columns[0].name}" column`
    : entities.projects.length > 0
    ? ` in "${entities.projects[0].name}" project`
    : '';

  return {
    success: true,
    message: `✅ Added label "${labelToAdd.name}" to ${addedCount} task(s)${contextInfo}.`,
    action: 'update',
    data: { labelId: labelToAdd.id, taskCount: addedCount }
  };
}

async function handleRemoveLabel(entities, message) {
  const isBulk = detectBulkOperation(message);
  const labelToRemove = entities.labels[0];

  if (!labelToRemove) {
    return {
      success: false,
      message: `Please specify which label to remove. Example: "Remove label Bug from task X"`
    };
  }

  let tasksToUpdate = [];

  if (isBulk) {
    if (entities.columns.length > 0) {
      for (const col of entities.columns) {
        tasksToUpdate.push(...getTasksInColumn(col.id));
      }
    } else if (entities.projects.length > 0) {
      for (const proj of entities.projects) {
        tasksToUpdate.push(...getTasksInProject(proj.id));
      }
    }
  } else if (entities.tasks.length > 0) {
    tasksToUpdate = entities.tasks;
  }

  if (tasksToUpdate.length === 0) {
    return {
      success: false,
      message: `No tasks found. Please specify tasks to remove the label from.`
    };
  }

  let removedCount = 0;
  for (const task of tasksToUpdate) {
    if (Label.removeFromTask(task.id, labelToRemove.id)) {
      Activity.logLabelRemoved(task.id, labelToRemove.name);
      removedCount++;
    }
  }

  return {
    success: true,
    message: `✅ Removed label "${labelToRemove.name}" from ${removedCount} task(s).`,
    action: 'update',
    data: { labelId: labelToRemove.id, taskCount: removedCount }
  };
}

async function handleSearch(entities, message) {
  const normalized = normalize(message);

  // Check for specific search types
  if (normalized.includes('overdue')) {
    const tasks = searchTasks({ overdue: true });
    return {
      success: true,
      message: formatTaskList(tasks, 'Overdue Tasks'),
      action: 'search',
      data: tasks
    };
  }

  if (normalized.includes('today') || normalized.includes('due today')) {
    const tasks = searchTasks({ dueToday: true });
    return {
      success: true,
      message: formatTaskList(tasks, 'Tasks Due Today'),
      action: 'search',
      data: tasks
    };
  }

  // Priority search
  if (entities.priorities.length > 0) {
    const tasks = searchTasks({ priority: entities.priorities[0] });
    return {
      success: true,
      message: formatTaskList(tasks, `${entities.priorities[0].charAt(0).toUpperCase() + entities.priorities[0].slice(1)} Priority Tasks`),
      action: 'search',
      data: tasks
    };
  }

  // Label search
  if (entities.labels.length > 0) {
    const tasks = searchTasks({ labelName: entities.labels[0].name });
    return {
      success: true,
      message: formatTaskList(tasks, `Tasks with "${entities.labels[0].name}" label`),
      action: 'search',
      data: tasks
    };
  }

  // Project search
  if (entities.projects.length > 0) {
    const tasks = searchTasks({ projectId: entities.projects[0].id });
    return {
      success: true,
      message: formatTaskList(tasks, `Tasks in ${entities.projects[0].name}`),
      action: 'search',
      data: tasks
    };
  }

  // Column search
  if (entities.columns.length > 0) {
    const tasks = searchTasks({ columnId: entities.columns[0].id });
    return {
      success: true,
      message: formatTaskList(tasks, `Tasks in "${entities.columns[0].name}" column`),
      action: 'search',
      data: tasks
    };
  }

  // Default: show all tasks
  const tasks = getAllTasks();
  return {
    success: true,
    message: formatTaskList(tasks, 'All Tasks'),
    action: 'search',
    data: tasks
  };
}

async function handleCreate(entities, message) {
  // Extract task title - look for quoted text or text after "called/named/titled"
  let taskTitle = null;

  // Priority patterns - quoted text is most reliable
  const titlePatterns = [
    // Quoted title: create task "Fix bug" or create task 'Fix bug'
    /(?:create|add|new|make)\s+(?:a\s+)?task\s+["']([^"']+)["']/i,
    // Named/called: create task called Fix bug in To Do
    /(?:called|named|titled)\s+["']?(.+?)["']?\s+(?:in\s+(?:the\s+)?(?:column\s+)?)/i,
    // Task with specific title pattern
    /task\s+["']([^"']+)["']/i
  ];

  for (const pattern of titlePatterns) {
    const match = message.match(pattern);
    if (match) {
      taskTitle = match[1].trim();
      break;
    }
  }

  // Check if user is trying to create without a proper title
  // Pattern like "create a task in done" should prompt for title
  const noTitlePattern = /(?:create|add|new|make)\s+(?:a\s+)?task\s+in\s+/i;
  if (!taskTitle && noTitlePattern.test(message)) {
    return {
      success: false,
      message: `Please provide a task title. Use quotes for the title, like:\n• "Create task 'Fix login bug' in Done"\n• "Create task called Fix bug in To Do"`
    };
  }

  if (!taskTitle) {
    return {
      success: false,
      message: `Please provide a task title. Example:\n• "Create task 'Fix login bug' in To Do"\n• "Create task called Fix bug in Done in Unify CMS V6"`
    };
  }

  // Find target column - prioritize project context if available
  let targetColumn = null;
  const allColumns = getAllColumns();

  // If we have a project context, filter columns by that project
  if (entities.projects.length > 0) {
    const projectColumns = allColumns.filter(c => c.project_id === entities.projects[0].id);

    // First check if user specified a column
    if (entities.columns.length > 0) {
      // Find the column that matches within the specified project
      targetColumn = projectColumns.find(c =>
        entities.columns.some(ec => ec.id === c.id)
      );
    }

    // If no specific column found, try to find by name in the message
    if (!targetColumn) {
      const columnNames = ['to do', 'todo', 'in progress', 'done', 'testing', 'review'];
      const normalized = normalize(message);

      for (const colName of columnNames) {
        if (normalized.includes(colName)) {
          const match = findBestMatch(colName, projectColumns, c => c.name);
          if (match) {
            targetColumn = match.item;
            break;
          }
        }
      }
    }

    // Default to first column in the project (usually To Do)
    if (!targetColumn && projectColumns.length > 0) {
      targetColumn = projectColumns[0];
    }
  } else {
    // No project specified - use entities.columns or default
    targetColumn = entities.columns[0];

    if (!targetColumn) {
      const todoMatch = findBestMatch('to do', allColumns, c => c.name);
      if (todoMatch) {
        targetColumn = todoMatch.item;
      } else if (allColumns.length > 0) {
        targetColumn = allColumns[0];
      }
    }
  }

  if (!targetColumn) {
    return {
      success: false,
      message: `No column found. Please create a project with columns first.`
    };
  }

  // Determine priority
  const priority = entities.priorities[0] || 'medium';

  const newTask = Task.create({
    columnId: targetColumn.id,
    title: taskTitle,
    priority
  });

  // Log activity
  Activity.logCreated(newTask.id);

  // Add labels if mentioned
  for (const label of entities.labels) {
    Label.addToTask(newTask.id, label.id);
    Activity.logLabelAdded(newTask.id, label.name);
  }

  return {
    success: true,
    message: `✅ Created task "${taskTitle}" in "${targetColumn.name}" column (${targetColumn.project_name}).`,
    action: 'create',
    data: newTask
  };
}

async function handleMove(entities, message) {
  const normalized = normalize(message);

  // Find the task to move
  let taskToMove = entities.tasks[0];

  if (!taskToMove) {
    // Try to extract task name from message
    const allTasks = getAllTasks();

    // Look for task name patterns
    const movePatterns = [
      /move\s+(?:task\s+)?["']?(.+?)["']?\s+to/i,
      /transfer\s+["']?(.+?)["']?\s+to/i,
      /mark\s+["']?(.+?)["']?\s+as/i
    ];

    for (const pattern of movePatterns) {
      const match = message.match(pattern);
      if (match) {
        const taskMatch = findBestMatch(match[1], allTasks, t => t.title);
        if (taskMatch) {
          taskToMove = taskMatch.item;
          break;
        }
      }
    }
  }

  if (!taskToMove) {
    return {
      success: false,
      message: `Could not find the task. Please specify the task name more clearly.`
    };
  }

  // Find target column
  let targetColumn = entities.columns.find(c => c.id !== taskToMove.column_id);

  // Check for "done/completed" keywords
  if (!targetColumn && (normalized.includes('done') || normalized.includes('complete'))) {
    const allColumns = getAllColumns();
    const doneMatch = findBestMatch('done', allColumns, c => c.name);
    if (doneMatch) {
      targetColumn = doneMatch.item;
    }
  }

  if (!targetColumn) {
    return {
      success: false,
      message: `Please specify the target column. Example: "Move task X to Done"`
    };
  }

  // Get old column for activity logging
  const oldColumn = getAllColumns().find(c => c.id === taskToMove.column_id);

  // Get max position in target column
  const db = getDb();
  const maxPos = db.prepare(`SELECT MAX(position) as maxPos FROM tasks WHERE column_id = ?`).get(targetColumn.id);
  const position = (maxPos?.maxPos || 0) + 1000;

  Task.move(taskToMove.id, { columnId: targetColumn.id, position });
  Activity.logMoved(taskToMove.id, oldColumn?.name || 'Unknown', targetColumn.name);

  return {
    success: true,
    message: `✅ Moved "${taskToMove.title}" from "${oldColumn?.name}" to "${targetColumn.name}".`,
    action: 'move',
    data: { taskId: taskToMove.id, columnId: targetColumn.id }
  };
}

async function handleDelete(entities, message) {
  const isBulk = detectBulkOperation(message);

  let tasksToDelete = [];

  if (isBulk) {
    if (entities.columns.length > 0) {
      for (const col of entities.columns) {
        tasksToDelete.push(...getTasksInColumn(col.id));
      }
    } else if (entities.projects.length > 0) {
      for (const proj of entities.projects) {
        tasksToDelete.push(...getTasksInProject(proj.id));
      }
    }
  } else if (entities.tasks.length > 0) {
    tasksToDelete = entities.tasks;
  } else {
    // Try to find task from message
    const allTasks = getAllTasks();
    const deletePatterns = [
      /delete\s+(?:task\s+)?["']?(.+?)["']?$/i,
      /remove\s+(?:task\s+)?["']?(.+?)["']?$/i
    ];

    for (const pattern of deletePatterns) {
      const match = message.match(pattern);
      if (match) {
        const taskMatch = findBestMatch(match[1], allTasks, t => t.title);
        if (taskMatch) {
          tasksToDelete = [taskMatch.item];
          break;
        }
      }
    }
  }

  if (tasksToDelete.length === 0) {
    return {
      success: false,
      message: `No tasks found to delete. Please specify which task(s) to delete.`
    };
  }

  if (isBulk && tasksToDelete.length > 1) {
    return {
      success: false,
      message: `⚠️ This would delete ${tasksToDelete.length} tasks. Please be more specific or confirm by saying "Delete all tasks in [column/project] - I confirm".`
    };
  }

  for (const task of tasksToDelete) {
    Task.delete(task.id);
  }

  return {
    success: true,
    message: `✅ Deleted ${tasksToDelete.length} task(s).`,
    action: 'delete',
    data: { deletedCount: tasksToDelete.length }
  };
}

async function handleUpdatePriority(entities, message) {
  if (entities.priorities.length === 0) {
    return {
      success: false,
      message: `Please specify a priority level (high, medium, or low).`
    };
  }

  const newPriority = entities.priorities[0];
  const isBulk = detectBulkOperation(message);
  let tasksToUpdate = [];

  if (isBulk) {
    if (entities.columns.length > 0) {
      for (const col of entities.columns) {
        tasksToUpdate.push(...getTasksInColumn(col.id));
      }
    } else if (entities.projects.length > 0) {
      for (const proj of entities.projects) {
        tasksToUpdate.push(...getTasksInProject(proj.id));
      }
    }
  } else if (entities.tasks.length > 0) {
    tasksToUpdate = entities.tasks;
  }

  if (tasksToUpdate.length === 0) {
    return {
      success: false,
      message: `No tasks found. Please specify which task(s) to update.`
    };
  }

  for (const task of tasksToUpdate) {
    const oldPriority = task.priority;
    Task.update(task.id, { priority: newPriority });
    Activity.logPriorityChanged(task.id, oldPriority, newPriority);
  }

  return {
    success: true,
    message: `✅ Updated priority to "${newPriority}" for ${tasksToUpdate.length} task(s).`,
    action: 'update',
    data: { priority: newPriority, taskCount: tasksToUpdate.length }
  };
}

async function handlePrependTitle(entities, message) {
  // Extract the text to prepend
  let textToPrepend = null;

  // Try different patterns to extract the text
  const prependPatterns = [
    /(?:before\s+all|prepend|prefix|add\s+before)\s+.*?(?:task|tasks)?\s*(?:add\s+)?["']([^"']+)["']/i,
    /(?:add|prepend|prefix)\s+["']([^"']+)["']\s+(?:before|to\s+beginning)/i,
    /["']([^"']+)["']\s+(?:before|prepend|prefix)/i,
    /before\s+all\s+.*?task.*?add\s+["']?([^"']+?)["']?\s*$/i,
    /add\s+["']([^"']+)["']/i
  ];

  for (const pattern of prependPatterns) {
    const match = message.match(pattern);
    if (match) {
      textToPrepend = match[1].trim();
      break;
    }
  }

  // Also try to find quoted text anywhere in the message
  if (!textToPrepend) {
    const quotedMatch = message.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      textToPrepend = quotedMatch[1].trim();
    }
  }

  // Try to find text after common keywords
  if (!textToPrepend) {
    const keywordMatch = message.match(/(?:add|prepend)\s+(.+?)(?:\s+to\s+|\s+before\s+|$)/i);
    if (keywordMatch) {
      // Clean up the extracted text - remove common words
      let extracted = keywordMatch[1].trim();
      extracted = extracted.replace(/^(before|all|task|tasks|in|to)\s+/gi, '').trim();
      if (extracted && extracted.length > 2) {
        textToPrepend = extracted;
      }
    }
  }

  if (!textToPrepend) {
    return {
      success: false,
      message: `Please specify the text to add. Example: "Before all To Do tasks add 'Kaustav - '"`
    };
  }

  // Find tasks to update
  let tasksToUpdate = [];

  if (entities.columns.length > 0) {
    for (const col of entities.columns) {
      tasksToUpdate.push(...getTasksInColumn(col.id));
    }
  } else if (entities.projects.length > 0) {
    for (const proj of entities.projects) {
      tasksToUpdate.push(...getTasksInProject(proj.id));
    }
  }

  if (tasksToUpdate.length === 0) {
    return {
      success: false,
      message: `No tasks found. Please specify a column or project. Example: "Before all To Do tasks add 'Prefix - '"`
    };
  }

  // Update task titles
  let updatedCount = 0;
  for (const task of tasksToUpdate) {
    // Don't add prefix if it already exists
    if (!task.title.startsWith(textToPrepend)) {
      const newTitle = textToPrepend + task.title;
      Task.update(task.id, { title: newTitle });
      Activity.logUpdated(task.id, `Title prefixed with "${textToPrepend}"`);
      updatedCount++;
    }
  }

  const contextInfo = entities.columns.length > 0
    ? ` in "${entities.columns[0].name}" column`
    : entities.projects.length > 0
    ? ` in "${entities.projects[0].name}" project`
    : '';

  return {
    success: true,
    message: `✅ Added "${textToPrepend}" before ${updatedCount} task title(s)${contextInfo}.`,
    action: 'update',
    data: { prefix: textToPrepend, taskCount: updatedCount }
  };
}

async function handleAppendTitle(entities, message) {
  // Extract the text to append
  let textToAppend = null;

  const appendPatterns = [
    /(?:after\s+all|append|suffix|add\s+after)\s+.*?(?:task|tasks)?\s*(?:add\s+)?["']([^"']+)["']/i,
    /(?:add|append|suffix)\s+["']([^"']+)["']\s+(?:after|to\s+end)/i,
    /["']([^"']+)["']\s+(?:after|append|suffix)/i,
    /add\s+["']([^"']+)["']/i
  ];

  for (const pattern of appendPatterns) {
    const match = message.match(pattern);
    if (match) {
      textToAppend = match[1].trim();
      break;
    }
  }

  if (!textToAppend) {
    const quotedMatch = message.match(/["']([^"']+)["']/);
    if (quotedMatch) {
      textToAppend = quotedMatch[1].trim();
    }
  }

  if (!textToAppend) {
    return {
      success: false,
      message: `Please specify the text to add. Example: "After all Done tasks add ' - Completed'"`
    };
  }

  // Find tasks to update
  let tasksToUpdate = [];

  if (entities.columns.length > 0) {
    for (const col of entities.columns) {
      tasksToUpdate.push(...getTasksInColumn(col.id));
    }
  } else if (entities.projects.length > 0) {
    for (const proj of entities.projects) {
      tasksToUpdate.push(...getTasksInProject(proj.id));
    }
  }

  if (tasksToUpdate.length === 0) {
    return {
      success: false,
      message: `No tasks found. Please specify a column or project.`
    };
  }

  // Update task titles
  let updatedCount = 0;
  for (const task of tasksToUpdate) {
    if (!task.title.endsWith(textToAppend)) {
      const newTitle = task.title + textToAppend;
      Task.update(task.id, { title: newTitle });
      Activity.logUpdated(task.id, `Title suffixed with "${textToAppend}"`);
      updatedCount++;
    }
  }

  const contextInfo = entities.columns.length > 0
    ? ` in "${entities.columns[0].name}" column`
    : entities.projects.length > 0
    ? ` in "${entities.projects[0].name}" project`
    : '';

  return {
    success: true,
    message: `✅ Added "${textToAppend}" after ${updatedCount} task title(s)${contextInfo}.`,
    action: 'update',
    data: { suffix: textToAppend, taskCount: updatedCount }
  };
}

async function handleInfo() {
  const db = getDb();
  const projects = Project.getAll();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_tasks,
      SUM(CASE WHEN due_date < date('now') AND due_date IS NOT NULL THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN due_date = date('now') THEN 1 ELSE 0 END) as due_today,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
    FROM tasks
  `).get();

  let response = `## Project Summary\n\n`;
  response += `**Projects:** ${projects.length}\n`;
  response += `**Total Tasks:** ${stats.total_tasks}\n`;
  response += `**Overdue:** ${stats.overdue}\n`;
  response += `**Due Today:** ${stats.due_today}\n`;
  response += `**High Priority:** ${stats.high_priority}\n\n`;

  response += `### Projects:\n`;
  projects.forEach(p => {
    response += `• **${p.name}**: ${p.task_count || 0} tasks\n`;
  });

  return {
    success: true,
    message: response,
    action: 'info',
    data: { projects, stats }
  };
}

async function handleHelp() {
  return {
    success: true,
    message: `## I can help you manage tasks with natural language!

### Search Tasks
• "Show all tasks"
• "Show tasks in To Do column"
• "Find high priority tasks"
• "What's overdue?"
• "Show tasks in [project name]"
• "Find tasks with bug label"

### Create Tasks
• "Create task called [title] in [column]"
• "Add a new task [title]"

### Update Tasks
• "Move [task] to Done"
• "Add tag Bug to [task]"
• "Add label Bug to all tasks in To Do"
• "Set priority high for [task]"
• "Mark [task] as done"

### Delete Tasks
• "Delete task [title]"

### Bulk Operations
• "Add tag Bug to all To Do tasks"
• "Move all tasks in Review to Done"
• "Before all To Do tasks add 'Name - '"
• "After all Done tasks add ' - Complete'"

### Info
• "Show project info"
• "How many tasks?"

Just type naturally and I'll try to understand!`,
    action: 'help'
  };
}

// ================== MAIN PROCESSOR ==================

export async function processMessage(message, context = {}) {
  try {
    // Extract entities from message
    const entities = extractEntities(message);

    // Detect intended action
    const action = detectAction(message);

    console.log('Detected action:', action);
    console.log('Entities:', JSON.stringify(entities, null, 2));

    switch (action) {
      case 'HELP':
        return await handleHelp();

      case 'INFO':
        return await handleInfo();

      case 'SEARCH':
        return await handleSearch(entities, message);

      case 'CREATE':
        return await handleCreate(entities, message);

      case 'MOVE':
      case 'MARK_DONE':
        return await handleMove(entities, message);

      case 'ADD_TAG':
        return await handleAddLabel(entities, message);

      case 'REMOVE_TAG':
        return await handleRemoveLabel(entities, message);

      case 'DELETE':
        return await handleDelete(entities, message);

      case 'PREPEND_TITLE':
        return await handlePrependTitle(entities, message);

      case 'APPEND_TITLE':
        return await handleAppendTitle(entities, message);

      case 'UPDATE':
        // Check what kind of update
        if (entities.priorities.length > 0) {
          return await handleUpdatePriority(entities, message);
        }
        if (entities.labels.length > 0) {
          return await handleAddLabel(entities, message);
        }
        return {
          success: false,
          message: `What would you like to update? You can change priority, add labels, or move tasks.`
        };

      default:
        // Try to guess intent based on entities
        if (entities.labels.length > 0 && (message.toLowerCase().includes('add') || message.toLowerCase().includes('tag'))) {
          return await handleAddLabel(entities, message);
        }

        if (entities.tasks.length > 0 || entities.columns.length > 0) {
          return await handleSearch(entities, message);
        }

        return {
          success: false,
          message: `I'm not sure what you want to do. Try being more specific or say "help" to see what I can do!

**Quick examples:**
• "Add tag Bug to all tasks in To Do"
• "Show all high priority tasks"
• "Move task X to Done"
• "Create task called Fix bug in To Do"`,
          action: 'unknown'
        };
    }
  } catch (error) {
    console.error('AI Chat Error:', error);
    return {
      success: false,
      message: `Sorry, something went wrong: ${error.message}`,
      action: 'error'
    };
  }
}
