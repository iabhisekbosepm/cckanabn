import { ColumnModel } from '../schemas/Column.js';
import { TaskModel } from '../schemas/Task.js';
import { NoteModel } from '../schemas/Note.js';
import { ActivityModel } from '../schemas/Activity.js';
import { SubtaskModel } from '../schemas/Subtask.js';
import { AttachmentModel } from '../schemas/Attachment.js';

const POSITION_GAP = 1000;

export class Column {
  static async getByProjectId(projectId) {
    const columns = await ColumnModel.find({ project_id: projectId })
      .sort({ position: 1 })
      .lean();
    return columns.map(c => ({ ...c, id: c._id }));
  }

  static async getById(id) {
    const column = await ColumnModel.findById(id).lean();
    if (!column) return null;
    return { ...column, id: column._id };
  }

  static async create({ projectId, name, color }) {
    // Get the max position for this project
    const maxColumn = await ColumnModel.findOne({ project_id: projectId })
      .sort({ position: -1 })
      .lean();

    const position = (maxColumn?.position || 0) + POSITION_GAP;

    const column = await ColumnModel.create({
      project_id: projectId,
      name,
      position,
      color: color || '#E5E7EB'
    });

    return this.getById(column._id);
  }

  static async update(id, { name, color }) {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    await ColumnModel.findByIdAndUpdate(id, updateData);
    return this.getById(id);
  }

  static async reorder(id, newPosition) {
    await ColumnModel.findByIdAndUpdate(id, { position: newPosition });
    return this.getById(id);
  }

  static async reorderAll(projectId, columnIds) {
    await Promise.all(columnIds.map((columnId, index) =>
      ColumnModel.findOneAndUpdate(
        { _id: columnId, project_id: projectId },
        { position: (index + 1) * POSITION_GAP }
      )
    ));
    return this.getByProjectId(projectId);
  }

  static async delete(id) {
    // Delete all tasks and related data in this column
    const tasks = await TaskModel.find({ column_id: id });
    const taskIds = tasks.map(t => t._id);

    if (taskIds.length > 0) {
      await NoteModel.deleteMany({ task_id: { $in: taskIds } });
      await ActivityModel.deleteMany({ task_id: { $in: taskIds } });
      await SubtaskModel.deleteMany({ task_id: { $in: taskIds } });
      await AttachmentModel.deleteMany({ task_id: { $in: taskIds } });
      await TaskModel.deleteMany({ column_id: id });
    }

    const result = await ColumnModel.findByIdAndDelete(id);
    return result !== null;
  }
}
