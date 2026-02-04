import { SubtaskModel } from '../schemas/Subtask.js';

export class Subtask {
  static async getByTaskId(taskId) {
    const subtasks = await SubtaskModel.find({ task_id: taskId })
      .sort({ position: 1 })
      .lean();
    return subtasks.map(s => ({ ...s, id: s._id }));
  }

  static async getById(id) {
    const subtask = await SubtaskModel.findById(id).lean();
    if (!subtask) return null;
    return { ...subtask, id: subtask._id };
  }

  static async create({ taskId, title }) {
    // Get max position for this task
    const maxSubtask = await SubtaskModel.findOne({ task_id: taskId })
      .sort({ position: -1 })
      .lean();
    const position = (maxSubtask?.position || 0) + 1;

    const subtask = await SubtaskModel.create({
      task_id: taskId,
      title,
      position
    });

    return this.getById(subtask._id);
  }

  static async update(id, { title, completed }) {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (completed !== undefined) updateData.completed = completed;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    await SubtaskModel.findByIdAndUpdate(id, updateData);
    return this.getById(id);
  }

  static async toggle(id) {
    const subtask = await SubtaskModel.findById(id);
    if (!subtask) return null;

    await SubtaskModel.findByIdAndUpdate(id, {
      completed: !subtask.completed
    });

    return this.getById(id);
  }

  static async delete(id) {
    const result = await SubtaskModel.findByIdAndDelete(id);
    return result !== null;
  }

  static async deleteByTaskId(taskId) {
    const result = await SubtaskModel.deleteMany({ task_id: taskId });
    return result.deletedCount;
  }

  static async reorder(taskId, subtaskIds) {
    await Promise.all(subtaskIds.map((id, index) =>
      SubtaskModel.findOneAndUpdate(
        { _id: id, task_id: taskId },
        { position: index + 1 }
      )
    ));
    return this.getByTaskId(taskId);
  }

  static async getStats(taskId) {
    const total = await SubtaskModel.countDocuments({ task_id: taskId });
    const completed = await SubtaskModel.countDocuments({ task_id: taskId, completed: true });
    return { total, completed };
  }
}
