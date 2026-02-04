/**
 * Parses text input and extracts tasks organized by column names.
 *
 * Supported formats:
 * - "Column Name:" followed by tasks on new lines
 * - Tasks can be numbered (1. 2. 3.) or bulleted (- or *)
 * - Tasks can have additional notes after a dash
 *
 * Example:
 * Done:
 * 1. Task one
 * 2. Task two
 *
 * In Progress:
 * - Task three - with notes
 */

export function parseTasksText(text) {
  const result = {};
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  let currentColumn = null;

  for (const line of lines) {
    // Check if this line is a column header (ends with colon, not starting with number/bullet)
    const columnMatch = line.match(/^([A-Za-z][A-Za-z0-9\s\-_]+):$/);

    if (columnMatch) {
      currentColumn = columnMatch[1].trim();
      if (!result[currentColumn]) {
        result[currentColumn] = [];
      }
      continue;
    }

    // If we have a current column, parse the task
    if (currentColumn) {
      const task = parseTaskLine(line);
      if (task) {
        result[currentColumn].push(task);
      }
    }
  }

  return result;
}

function parseTaskLine(line) {
  // Remove leading numbers, bullets, or dashes
  // Patterns: "1. ", "1) ", "- ", "* ", etc.
  let cleanedLine = line.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, '').trim();

  if (!cleanedLine) return null;

  // Check if there's a note/description after a dash or parentheses
  // e.g., "Task name - some notes" or "Task name (some notes)"
  let title = cleanedLine;
  let description = '';

  // Match pattern: "Title - Description" or "Title – Description"
  const dashMatch = cleanedLine.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (dashMatch) {
    title = dashMatch[1].trim();
    description = dashMatch[2].trim();
  }

  // Detect priority based on keywords
  let priority = 'medium';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('urgent') || lowerTitle.includes('critical') || lowerTitle.includes('asap')) {
    priority = 'high';
  } else if (lowerTitle.includes('low priority') || lowerTitle.includes('minor')) {
    priority = 'low';
  }

  return {
    title,
    description,
    priority
  };
}

/**
 * Bulk import tasks into a project
 * Creates columns if they don't exist, adds tasks to existing columns if they do
 */
export function prepareBulkImport(parsedTasks, existingColumns) {
  const columnNameMap = {};
  existingColumns.forEach(col => {
    columnNameMap[col.name.toLowerCase()] = col;
  });

  const result = {
    columnsToCreate: [],
    tasksToCreate: [] // { columnName, columnId (if exists), tasks }
  };

  for (const [columnName, tasks] of Object.entries(parsedTasks)) {
    const existingColumn = columnNameMap[columnName.toLowerCase()];

    if (existingColumn) {
      result.tasksToCreate.push({
        columnName,
        columnId: existingColumn.id,
        tasks
      });
    } else {
      result.columnsToCreate.push(columnName);
      result.tasksToCreate.push({
        columnName,
        columnId: null, // Will be assigned after column creation
        tasks
      });
    }
  }

  return result;
}
