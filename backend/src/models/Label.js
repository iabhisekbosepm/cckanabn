import { LabelModel } from '../schemas/Label.js';
import { TaskModel } from '../schemas/Task.js';

export class Label {
  static async getAll() {
    const labels = await LabelModel.find().sort({ name: 1 }).lean();
    return labels.map(l => ({ ...l, id: l._id }));
  }

  static async getById(id) {
    const label = await LabelModel.findById(id).lean();
    if (!label) return null;
    return { ...label, id: label._id };
  }

  static async getByName(name) {
    const label = await LabelModel.findOne({ name }).lean();
    if (!label) return null;
    return { ...label, id: label._id };
  }

  static async create({ name, color }) {
    const label = await LabelModel.create({
      name,
      color: color || '#6B7280'
    });
    return this.getById(label._id);
  }

  static async update(id, { name, color }) {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    await LabelModel.findByIdAndUpdate(id, updateData);
    return this.getById(id);
  }

  static async delete(id) {
    // Remove label from all tasks
    await TaskModel.updateMany(
      { labels: id },
      { $pull: { labels: id } }
    );

    const result = await LabelModel.findByIdAndDelete(id);
    return result !== null;
  }

  // Task-Label relationships (labels are now embedded in tasks)
  static async getByTaskId(taskId) {
    const task = await TaskModel.findById(taskId).populate('labels').lean();
    if (!task || !task.labels) return [];
    return task.labels.map(l => ({ ...l, id: l._id }));
  }

  static async addToTask(taskId, labelId) {
    try {
      await TaskModel.findByIdAndUpdate(taskId, {
        $addToSet: { labels: labelId }
      });
      return true;
    } catch {
      return false;
    }
  }

  static async removeFromTask(taskId, labelId) {
    const result = await TaskModel.findByIdAndUpdate(taskId, {
      $pull: { labels: labelId }
    });
    return result !== null;
  }

  static async setTaskLabels(taskId, labelIds) {
    await TaskModel.findByIdAndUpdate(taskId, {
      labels: labelIds || []
    });
    return this.getByTaskId(taskId);
  }
}
