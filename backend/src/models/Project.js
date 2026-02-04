import { ProjectModel } from '../schemas/Project.js';
import { ColumnModel } from '../schemas/Column.js';
import { TaskModel } from '../schemas/Task.js';
import { LabelModel } from '../schemas/Label.js';
import { NoteModel } from '../schemas/Note.js';
import { ActivityModel } from '../schemas/Activity.js';

export class Project {
  static async getAll() {
    const projects = await ProjectModel.find().sort({ created_at: -1 }).lean();

    // Get counts for each project
    const result = await Promise.all(projects.map(async (project) => {
      const columns = await ColumnModel.find({ project_id: project._id });
      const columnIds = columns.map(c => c._id);
      const taskCount = await TaskModel.countDocuments({ column_id: { $in: columnIds } });

      return {
        ...project,
        id: project._id,
        column_count: columns.length,
        task_count: taskCount
      };
    }));

    return result;
  }

  static async getById(id) {
    const project = await ProjectModel.findById(id).lean();
    if (!project) return null;
    return { ...project, id: project._id };
  }

  static async getWithColumnsAndTasks(id) {
    const project = await this.getById(id);
    if (!project) return null;

    const columns = await ColumnModel.find({ project_id: id }).sort({ position: 1 }).lean();

    const columnsWithTasks = await Promise.all(columns.map(async (column) => {
      const tasks = await TaskModel.find({ column_id: column._id })
        .sort({ position: 1 })
        .populate('labels')
        .lean();

      const tasksWithCounts = await Promise.all(tasks.map(async (task) => {
        const notes_count = await NoteModel.countDocuments({ task_id: task._id });
        const activity_count = await ActivityModel.countDocuments({ task_id: task._id });

        return {
          ...task,
          id: task._id,
          column_id: task.column_id,
          labels: task.labels?.map(l => ({ ...l, id: l._id })) || [],
          notes_count,
          activity_count
        };
      }));

      return {
        ...column,
        id: column._id,
        tasks: tasksWithCounts
      };
    }));

    return {
      ...project,
      columns: columnsWithTasks
    };
  }

  static async create({ name, description, color }) {
    const project = await ProjectModel.create({
      name,
      description: description || null,
      color: color || '#3B82F6'
    });
    return this.getById(project._id);
  }

  static async update(id, { name, description, color }) {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    await ProjectModel.findByIdAndUpdate(id, updateData);
    return this.getById(id);
  }

  static async delete(id) {
    // First delete all related data
    const columns = await ColumnModel.find({ project_id: id });
    const columnIds = columns.map(c => c._id);

    if (columnIds.length > 0) {
      const tasks = await TaskModel.find({ column_id: { $in: columnIds } });
      const taskIds = tasks.map(t => t._id);

      if (taskIds.length > 0) {
        await NoteModel.deleteMany({ task_id: { $in: taskIds } });
        await ActivityModel.deleteMany({ task_id: { $in: taskIds } });
      }

      await TaskModel.deleteMany({ column_id: { $in: columnIds } });
      await ColumnModel.deleteMany({ project_id: id });
    }

    const result = await ProjectModel.findByIdAndDelete(id);
    return result !== null;
  }
}
