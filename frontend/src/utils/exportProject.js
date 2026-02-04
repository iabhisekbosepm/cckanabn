/**
 * Export project data to markdown format
 */
export function exportProjectToMarkdown(project) {
  if (!project || !project.columns) return '';

  let markdown = '';

  for (const column of project.columns) {
    // Add column header
    markdown += `${column.name}:\n`;

    if (column.tasks && column.tasks.length > 0) {
      column.tasks.forEach((task, index) => {
        // Format task with number
        let taskLine = `${index + 1}. ${task.title}`;

        // Add description if exists
        if (task.description) {
          taskLine += ` - ${task.description}`;
        }

        // Add priority indicator for high priority tasks
        if (task.priority === 'high') {
          taskLine += ' [URGENT]';
        }

        // Add due date if exists
        if (task.due_date) {
          taskLine += ` (Due: ${task.due_date})`;
        }

        markdown += `${taskLine}\n`;
      });
    }

    markdown += '\n';
  }

  return markdown.trim();
}

/**
 * Download content as a file
 */
export function downloadAsFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export project and trigger download
 */
export function exportProject(project) {
  const markdown = exportProjectToMarkdown(project);
  const filename = `${project.name.toLowerCase().replace(/\s+/g, '-')}-tasks.md`;
  downloadAsFile(markdown, filename);
}

/**
 * Export all projects to markdown format
 */
export function exportAllProjectsToMarkdown(projects) {
  if (!projects || projects.length === 0) return '';

  let markdown = '';

  for (const project of projects) {
    // Add project header
    markdown += `# ${project.name}\n`;
    if (project.description) {
      markdown += `${project.description}\n`;
    }
    markdown += '\n';

    if (project.columns && project.columns.length > 0) {
      for (const column of project.columns) {
        // Add column header
        markdown += `## ${column.name}:\n`;

        if (column.tasks && column.tasks.length > 0) {
          column.tasks.forEach((task, index) => {
            // Format task with number
            let taskLine = `${index + 1}. ${task.title}`;

            // Add description if exists
            if (task.description) {
              taskLine += ` - ${task.description}`;
            }

            // Add priority indicator for high priority tasks
            if (task.priority === 'high') {
              taskLine += ' [URGENT]';
            }

            // Add due date if exists
            if (task.due_date) {
              taskLine += ` (Due: ${task.due_date})`;
            }

            // Add labels if exist
            if (task.labels && task.labels.length > 0) {
              taskLine += ` [${task.labels.map(l => l.name).join(', ')}]`;
            }

            markdown += `${taskLine}\n`;
          });
        } else {
          markdown += `No tasks\n`;
        }

        markdown += '\n';
      }
    }

    markdown += '\n---\n\n';
  }

  return markdown.trim();
}

/**
 * Export all projects and trigger download
 */
export function exportAllProjects(projects) {
  const markdown = exportAllProjectsToMarkdown(projects);
  const date = new Date().toISOString().split('T')[0];
  const filename = `all-projects-${date}.md`;
  downloadAsFile(markdown, filename);
}
