import { TaskModel } from '../schemas/Task.js';
import { ColumnModel } from '../schemas/Column.js';
import { ProjectModel } from '../schemas/Project.js';
import { NoteModel } from '../schemas/Note.js';
import { ActivityModel } from '../schemas/Activity.js';
import { SubtaskModel } from '../schemas/Subtask.js';
import { AttachmentModel } from '../schemas/Attachment.js';

const POSITION_GAP = 1000;

export class Task {
  static async getByColumnId(columnId) {
    const tasks = await TaskModel.find({ column_id: columnId })
      .sort({ position: 1 })
      .populate('labels')
      .lean();

    return Promise.all(tasks.map(async (task) => {
      const notes_count = await NoteModel.countDocuments({ task_id: task._id });
      const activity_count = await ActivityModel.countDocuments({ task_id: task._id });
      return {
        ...task,
        id: task._id,
        labels: task.labels?.map(l => ({ ...l, id: l._id })) || [],
        notes_count,
        activity_count
      };
    }));
  }

  static async getById(id) {
    const task = await TaskModel.findById(id).populate('labels').lean();
    if (!task) return null;

    const notes_count = await NoteModel.countDocuments({ task_id: task._id });
    const activity_count = await ActivityModel.countDocuments({ task_id: task._id });

    return {
      ...task,
      id: task._id,
      labels: task.labels?.map(l => ({ ...l, id: l._id })) || [],
      notes_count,
      activity_count
    };
  }

  static async create({ columnId, title, description, priority, dueDate }) {
    // Get the max position for this column
    const maxTask = await TaskModel.findOne({ column_id: columnId })
      .sort({ position: -1 })
      .lean();

    const position = (maxTask?.position || 0) + POSITION_GAP;

    const task = await TaskModel.create({
      column_id: columnId,
      title,
      description: description || null,
      position,
      priority: priority || 'medium',
      due_date: dueDate || null
    });

    return this.getById(task._id);
  }

  static async update(id, { title, description, priority, dueDate }) {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.due_date = dueDate;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    await TaskModel.findByIdAndUpdate(id, updateData);
    return this.getById(id);
  }

  static async move(id, { columnId, position }) {
    await TaskModel.findByIdAndUpdate(id, {
      column_id: columnId,
      position
    });
    return this.getById(id);
  }

  static async reorderInColumn(columnId, taskIds) {
    await Promise.all(taskIds.map((taskId, index) =>
      TaskModel.findOneAndUpdate(
        { _id: taskId, column_id: columnId },
        { position: (index + 1) * POSITION_GAP }
      )
    ));
    return this.getByColumnId(columnId);
  }

  static async delete(id) {
    // Delete related data
    await NoteModel.deleteMany({ task_id: id });
    await ActivityModel.deleteMany({ task_id: id });
    await SubtaskModel.deleteMany({ task_id: id });
    await AttachmentModel.deleteMany({ task_id: id });

    const result = await TaskModel.findByIdAndDelete(id);
    return result !== null;
  }

  static async getAllForHeatmap() {
    const tasks = await TaskModel.find()
      .sort({ due_date: 1, priority: -1 })
      .lean();

    return Promise.all(tasks.map(async (task) => {
      const column = await ColumnModel.findById(task.column_id).lean();
      const project = column ? await ProjectModel.findById(column.project_id).lean() : null;

      return {
        id: task._id,
        title: task.title,
        priority: task.priority,
        due_date: task.due_date?.toISOString().split('T')[0] || null,
        created_at: task.created_at?.toISOString().split('T')[0] || null,
        column_name: column?.name || 'Unknown',
        project_name: project?.name || 'Unknown',
        project_color: project?.color || '#3B82F6'
      };
    }));
  }

  static async getTasksByDateRange(startDate, endDate) {
    const tasks = await TaskModel.find({
      due_date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    })
      .sort({ due_date: 1, priority: -1 })
      .lean();

    return Promise.all(tasks.map(async (task) => {
      const column = await ColumnModel.findById(task.column_id).lean();
      const project = column ? await ProjectModel.findById(column.project_id).lean() : null;

      return {
        id: task._id,
        title: task.title,
        priority: task.priority,
        due_date: task.due_date?.toISOString().split('T')[0] || null,
        created_at: task.created_at?.toISOString().split('T')[0] || null,
        column_name: column?.name || 'Unknown',
        project_name: project?.name || 'Unknown',
        project_color: project?.color || '#3B82F6'
      };
    }));
  }
}
