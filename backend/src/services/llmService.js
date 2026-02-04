/**
 * LLM Service - Ollama Integration for AI-powered chat
 * Provides context-aware responses about kanban board data
 */

import { getDb } from '../config/database.js';

// Default values (can be overridden via request)
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// ================== DATABASE CONTEXT BUILDERS ==================

function getProjectsContext() {
  const db = getDb();
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks t
       JOIN columns c ON t.column_id = c.id
       WHERE c.project_id = p.id) as task_count
    FROM projects p
    ORDER BY p.name
  `).all();

  return projects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    color: p.color,
    taskCount: p.task_count
  }));
}

function getColumnsContext() {
  const db = getDb();
  return db.prepare(`
    SELECT c.*, p.name as project_name,
      (SELECT COUNT(*) FROM tasks WHERE column_id = c.id) as task_count
    FROM columns c
    JOIN projects p ON c.project_id = p.id
    ORDER BY p.name, c.position
  `).all();
}

function getTasksContext() {
  const db = getDb();
  const tasks = db.prepare(`
    SELECT t.*, c.name as column_name, p.name as project_name,
      GROUP_CONCAT(l.name) as label_names
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN projects p ON c.project_id = p.id
    LEFT JOIN task_labels tl ON t.id = tl.task_id
    LEFT JOIN labels l ON tl.label_id = l.id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `).all();

  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description || '',
    priority: t.priority,
    dueDate: t.due_date,
    column: t.column_name,
    project: t.project_name,
    labels: t.label_names ? t.label_names.split(',') : [],
    createdAt: t.created_at
  }));
}

function getLabelsContext() {
  const db = getDb();
  return db.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM task_labels WHERE label_id = l.id) as usage_count
    FROM labels l
    ORDER BY l.name
  `).all();
}

function getStatsContext() {
  const db = getDb();
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM projects) as total_projects,
      (SELECT COUNT(*) FROM tasks) as total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE due_date < date('now') AND due_date IS NOT NULL) as overdue_tasks,
      (SELECT COUNT(*) FROM tasks WHERE due_date = date('now')) as due_today,
      (SELECT COUNT(*) FROM tasks WHERE priority = 'high') as high_priority,
      (SELECT COUNT(*) FROM tasks WHERE priority = 'medium') as medium_priority,
      (SELECT COUNT(*) FROM tasks WHERE priority = 'low') as low_priority
  `).get();

  return stats;
}

function getTasksByStatus() {
  const db = getDb();
  return db.prepare(`
    SELECT c.name as status, COUNT(*) as count, p.name as project
    FROM tasks t
    JOIN columns c ON t.column_id = c.id
    JOIN projects p ON c.project_id = p.id
    GROUP BY c.id
    ORDER BY p.name, c.position
  `).all();
}

// Build full context for the LLM
function buildKanbanContext() {
  const projects = getProjectsContext();
  const columns = getColumnsContext();
  const tasks = getTasksContext();
  const labels = getLabelsContext();
  const stats = getStatsContext();
  const tasksByStatus = getTasksByStatus();

  const today = new Date().toISOString().split('T')[0];

  // Build a structured context string
  let context = `=== KANBAN BOARD DATA (as of ${today}) ===\n\n`;

  // Statistics Overview
  context += `## OVERVIEW STATISTICS\n`;
  context += `- Total Projects: ${stats.total_projects}\n`;
  context += `- Total Tasks: ${stats.total_tasks}\n`;
  context += `- Overdue Tasks: ${stats.overdue_tasks}\n`;
  context += `- Due Today: ${stats.due_today}\n`;
  context += `- High Priority: ${stats.high_priority}\n`;
  context += `- Medium Priority: ${stats.medium_priority}\n`;
  context += `- Low Priority: ${stats.low_priority}\n\n`;

  // Projects
  context += `## PROJECTS (${projects.length})\n`;
  projects.forEach(p => {
    context += `- ${p.name}: ${p.taskCount} tasks${p.description ? ` - ${p.description}` : ''}\n`;
  });
  context += '\n';

  // Columns by Project
  context += `## COLUMNS/STAGES\n`;
  const columnsByProject = {};
  columns.forEach(c => {
    if (!columnsByProject[c.project_name]) columnsByProject[c.project_name] = [];
    columnsByProject[c.project_name].push(`${c.name} (${c.task_count} tasks)`);
  });
  Object.entries(columnsByProject).forEach(([project, cols]) => {
    context += `${project}: ${cols.join(' → ')}\n`;
  });
  context += '\n';

  // Labels
  context += `## LABELS/TAGS (${labels.length})\n`;
  labels.forEach(l => {
    context += `- ${l.name}: used ${l.usage_count} times\n`;
  });
  context += '\n';

  // Tasks Summary by Status
  context += `## TASKS BY STATUS\n`;
  tasksByStatus.forEach(s => {
    context += `- ${s.project} / ${s.status}: ${s.count} tasks\n`;
  });
  context += '\n';

  // All Tasks Details (limited to recent 100 for context size)
  const recentTasks = tasks.slice(0, 100);
  context += `## TASK DETAILS (showing ${recentTasks.length} of ${tasks.length})\n`;
  recentTasks.forEach(t => {
    let taskLine = `- [${t.project}/${t.column}] "${t.title}"`;
    taskLine += ` | Priority: ${t.priority}`;
    if (t.dueDate) taskLine += ` | Due: ${t.dueDate}`;
    if (t.labels.length > 0) taskLine += ` | Labels: ${t.labels.join(', ')}`;
    if (t.description) taskLine += ` | Desc: ${t.description.substring(0, 100)}`;
    context += taskLine + '\n';
  });

  // Overdue Tasks Highlight
  const overdueTasks = tasks.filter(t => t.dueDate && t.dueDate < today);
  if (overdueTasks.length > 0) {
    context += `\n## OVERDUE TASKS (${overdueTasks.length})\n`;
    overdueTasks.slice(0, 20).forEach(t => {
      context += `- "${t.title}" in ${t.project}/${t.column} - Due: ${t.dueDate}\n`;
    });
  }

  // Due Today
  const dueTodayTasks = tasks.filter(t => t.dueDate === today);
  if (dueTodayTasks.length > 0) {
    context += `\n## DUE TODAY (${dueTodayTasks.length})\n`;
    dueTodayTasks.forEach(t => {
      context += `- "${t.title}" in ${t.project}/${t.column}\n`;
    });
  }

  // High Priority Tasks
  const highPriorityTasks = tasks.filter(t => t.priority === 'high');
  if (highPriorityTasks.length > 0) {
    context += `\n## HIGH PRIORITY TASKS (${highPriorityTasks.length})\n`;
    highPriorityTasks.slice(0, 20).forEach(t => {
      context += `- "${t.title}" in ${t.project}/${t.column}${t.dueDate ? ` - Due: ${t.dueDate}` : ''}\n`;
    });
  }

  return context;
}

// ================== OLLAMA API ==================

async function callOllama(prompt, systemPrompt, options = {}) {
  const ollamaUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  const ollamaModel = options.ollamaModel || DEFAULT_OLLAMA_MODEL;

  try {
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 1000
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.message?.content || 'I could not generate a response.';
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Ollama is not running. Please start Ollama with: ollama serve');
    }
    throw error;
  }
}

// Check if Ollama is available
async function checkOllamaStatus(ollamaUrl = DEFAULT_OLLAMA_URL) {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      return {
        available: true,
        models: data.models?.map(m => m.name) || []
      };
    }
    return { available: false, error: 'Ollama not responding' };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

// ================== MAIN CHAT FUNCTION ==================

export async function chat(userMessage, conversationHistory = [], options = {}) {
  // Build context from database
  const kanbanContext = buildKanbanContext();
  const modelName = options.ollamaModel || DEFAULT_OLLAMA_MODEL;

  // System prompt with context
  const systemPrompt = `You are an intelligent AI assistant powered by the "${modelName}" model running locally via Ollama. You are the AI assistant for a Kanban board task management application called "CodeClouds Products Board".

IMPORTANT IDENTITY RULES:
- You are "${modelName}" - a local AI model running via Ollama
- You are NOT Claude, ChatGPT, or any other AI assistant
- If asked about your identity, say you are "${modelName}" running locally via Ollama
- Never claim to be made by Anthropic, OpenAI, or any other company unless that is true for your actual model

You have complete knowledge of all projects, tasks, columns, labels, and their statuses in this Kanban board.

Your role is to:
1. Answer questions about tasks, projects, deadlines, and priorities
2. Provide insights and summaries about work progress
3. Help users understand their workload and priorities
4. Give recommendations on task management
5. Identify bottlenecks, overdue items, and urgent matters

FORMATTING RULES (VERY IMPORTANT):
- Use ONLY simple markdown formatting: **bold**, *italic*, bullet points (-), numbered lists (1.), headers (#, ##)
- NEVER use HTML tags like <span>, <div>, <code>, etc.
- NEVER use inline CSS or style attributes
- NEVER output raw CSS like "background:#e5e7eb;padding:2px"
- For code or technical terms, wrap them in single backtick characters
- For tables, use simple markdown tables with | and -
- Keep formatting clean and simple

CONTENT GUIDELINES:
- Be concise but informative
- When listing tasks, include: task name, project, status, priority, and due date
- Highlight urgent or overdue items with **bold** or emojis
- If asked about something not in the data, clearly state that
- Be proactive in mentioning important items like overdue tasks or upcoming deadlines
- You cannot directly modify tasks - only provide information and recommendations

Here is the current state of the Kanban board:

${kanbanContext}

Today's date is: ${new Date().toISOString().split('T')[0]}

Remember: You have access to all the above data. Answer questions based on this information.`;

  // Build conversation context
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    conversationContext = '\n\nPrevious conversation:\n';
    conversationHistory.slice(-6).forEach(msg => {
      conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    conversationContext += '\n';
  }

  const fullPrompt = conversationContext + `User: ${userMessage}`;

  try {
    const response = await callOllama(fullPrompt, systemPrompt, options);
    return {
      success: true,
      message: response,
      action: 'chat'
    };
  } catch (error) {
    console.error('LLM Chat Error:', error);
    return {
      success: false,
      message: `AI Error: ${error.message}`,
      action: 'error'
    };
  }
}

export { checkOllamaStatus, buildKanbanContext };
