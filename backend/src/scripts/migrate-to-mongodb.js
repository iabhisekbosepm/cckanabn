import Database from 'better-sqlite3';
import mongoose from 'mongoose';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://abhisekbose:0Fb6dAdjfINlAWlY@cluster0.n4nswyy.mongodb.net/kanban?appName=Cluster0';

// Import schemas
import { ProjectModel } from '../schemas/Project.js';
import { ColumnModel } from '../schemas/Column.js';
import { TaskModel } from '../schemas/Task.js';
import { LabelModel } from '../schemas/Label.js';
import { NoteModel } from '../schemas/Note.js';
import { ActivityModel } from '../schemas/Activity.js';
import { SubtaskModel } from '../schemas/Subtask.js';
import { AttachmentModel } from '../schemas/Attachment.js';

// ID mapping (SQLite ID -> MongoDB ObjectId)
const idMaps = {
  projects: new Map(),
  columns: new Map(),
  tasks: new Map(),
  labels: new Map()
};

async function migrate() {
  console.log('Starting migration from SQLite to MongoDB Atlas...\n');

  // Connect to SQLite
  const dbPath = join(__dirname, '../../database/kanban.db');
  console.log(`Reading SQLite database from: ${dbPath}`);
  const sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');

  // Connect to MongoDB
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas!\n');

  try {
    // Clear existing data in MongoDB (optional - comment out if you want to preserve existing data)
    console.log('Clearing existing MongoDB data...');
    await ProjectModel.deleteMany({});
    await ColumnModel.deleteMany({});
    await TaskModel.deleteMany({});
    await LabelModel.deleteMany({});
    await NoteModel.deleteMany({});
    await ActivityModel.deleteMany({});
    await SubtaskModel.deleteMany({});
    await AttachmentModel.deleteMany({});
    console.log('Existing data cleared.\n');

    // 1. Migrate Labels
    console.log('Migrating labels...');
    const labels = sqlite.prepare('SELECT * FROM labels').all();
    for (const label of labels) {
      const newLabel = await LabelModel.create({
        name: label.name,
        color: label.color,
        created_at: label.created_at ? new Date(label.created_at) : new Date()
      });
      idMaps.labels.set(label.id, newLabel._id);
    }
    console.log(`  Migrated ${labels.length} labels`);

    // 2. Migrate Projects
    console.log('Migrating projects...');
    const projects = sqlite.prepare('SELECT * FROM projects').all();
    for (const project of projects) {
      const newProject = await ProjectModel.create({
        name: project.name,
        description: project.description,
        color: project.color,
        created_at: project.created_at ? new Date(project.created_at) : new Date(),
        updated_at: project.updated_at ? new Date(project.updated_at) : new Date()
      });
      idMaps.projects.set(project.id, newProject._id);
    }
    console.log(`  Migrated ${projects.length} projects`);

    // 3. Migrate Columns
    console.log('Migrating columns...');
    const columns = sqlite.prepare('SELECT * FROM columns').all();
    for (const column of columns) {
      const projectId = idMaps.projects.get(column.project_id);
      if (!projectId) {
        console.warn(`  Warning: Column "${column.name}" has invalid project_id: ${column.project_id}`);
        continue;
      }
      const newColumn = await ColumnModel.create({
        project_id: projectId,
        name: column.name,
        position: column.position,
        color: column.color,
        created_at: column.created_at ? new Date(column.created_at) : new Date(),
        updated_at: column.updated_at ? new Date(column.updated_at) : new Date()
      });
      idMaps.columns.set(column.id, newColumn._id);
    }
    console.log(`  Migrated ${columns.length} columns`);

    // 4. Migrate Tasks
    console.log('Migrating tasks...');
    const tasks = sqlite.prepare('SELECT * FROM tasks').all();
    for (const task of tasks) {
      const columnId = idMaps.columns.get(task.column_id);
      if (!columnId) {
        console.warn(`  Warning: Task "${task.title}" has invalid column_id: ${task.column_id}`);
        continue;
      }

      // Get task labels
      const taskLabels = sqlite.prepare('SELECT label_id FROM task_labels WHERE task_id = ?').all(task.id);
      const labelIds = taskLabels
        .map(tl => idMaps.labels.get(tl.label_id))
        .filter(id => id);

      const newTask = await TaskModel.create({
        column_id: columnId,
        title: task.title,
        description: task.description,
        position: task.position,
        priority: task.priority || 'medium',
        due_date: task.due_date ? new Date(task.due_date) : null,
        labels: labelIds,
        created_at: task.created_at ? new Date(task.created_at) : new Date(),
        updated_at: task.updated_at ? new Date(task.updated_at) : new Date()
      });
      idMaps.tasks.set(task.id, newTask._id);
    }
    console.log(`  Migrated ${tasks.length} tasks`);

    // 5. Migrate Notes
    console.log('Migrating notes...');
    const notes = sqlite.prepare('SELECT * FROM task_notes').all();
    let notesCount = 0;
    for (const note of notes) {
      const taskId = idMaps.tasks.get(note.task_id);
      if (!taskId) {
        console.warn(`  Warning: Note has invalid task_id: ${note.task_id}`);
        continue;
      }
      await NoteModel.create({
        task_id: taskId,
        content: note.content,
        author: note.author || 'User',
        created_at: note.created_at ? new Date(note.created_at) : new Date(),
        updated_at: note.updated_at ? new Date(note.updated_at) : new Date()
      });
      notesCount++;
    }
    console.log(`  Migrated ${notesCount} notes`);

    // 6. Migrate Activity
    console.log('Migrating activity logs...');
    const activities = sqlite.prepare('SELECT * FROM task_activity').all();
    let activityCount = 0;
    for (const activity of activities) {
      const taskId = idMaps.tasks.get(activity.task_id);
      if (!taskId) {
        console.warn(`  Warning: Activity has invalid task_id: ${activity.task_id}`);
        continue;
      }
      await ActivityModel.create({
        task_id: taskId,
        action: activity.action,
        details: activity.details,
        actor: activity.actor || 'User',
        created_at: activity.created_at ? new Date(activity.created_at) : new Date()
      });
      activityCount++;
    }
    console.log(`  Migrated ${activityCount} activity logs`);

    // 7. Migrate Subtasks
    console.log('Migrating subtasks...');
    const subtasks = sqlite.prepare('SELECT * FROM subtasks').all();
    let subtaskCount = 0;
    for (const subtask of subtasks) {
      const taskId = idMaps.tasks.get(subtask.task_id);
      if (!taskId) {
        console.warn(`  Warning: Subtask has invalid task_id: ${subtask.task_id}`);
        continue;
      }
      await SubtaskModel.create({
        task_id: taskId,
        title: subtask.title,
        completed: Boolean(subtask.completed),
        position: subtask.position,
        created_at: subtask.created_at ? new Date(subtask.created_at) : new Date()
      });
      subtaskCount++;
    }
    console.log(`  Migrated ${subtaskCount} subtasks`);

    // 8. Migrate Attachments
    console.log('Migrating attachments...');
    const attachments = sqlite.prepare('SELECT * FROM task_attachments').all();
    let attachmentCount = 0;
    for (const attachment of attachments) {
      const taskId = idMaps.tasks.get(attachment.task_id);
      if (!taskId) {
        console.warn(`  Warning: Attachment has invalid task_id: ${attachment.task_id}`);
        continue;
      }
      await AttachmentModel.create({
        task_id: taskId,
        title: attachment.title,
        url: attachment.url,
        type: attachment.type || 'link',
        created_at: attachment.created_at ? new Date(attachment.created_at) : new Date()
      });
      attachmentCount++;
    }
    console.log(`  Migrated ${attachmentCount} attachments`);

    console.log('\n========================================');
    console.log('Migration completed successfully!');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`  - Labels: ${labels.length}`);
    console.log(`  - Projects: ${projects.length}`);
    console.log(`  - Columns: ${columns.length}`);
    console.log(`  - Tasks: ${tasks.length}`);
    console.log(`  - Notes: ${notesCount}`);
    console.log(`  - Activity Logs: ${activityCount}`);
    console.log(`  - Subtasks: ${subtaskCount}`);
    console.log(`  - Attachments: ${attachmentCount}`);

  } catch (error) {
    console.error('\nMigration failed:', error);
    throw error;
  } finally {
    // Close connections
    sqlite.close();
    await mongoose.disconnect();
    console.log('\nConnections closed.');
  }
}

// Run migration
migrate().catch(console.error);
