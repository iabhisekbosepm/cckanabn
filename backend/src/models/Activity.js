import { ActivityModel } from '../schemas/Activity.js';

export class Activity {
  static async getByTaskId(taskId, limit = 50) {
    const activities = await ActivityModel.find({ task_id: taskId })
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();
    return activities.map(a => ({ ...a, id: a._id }));
  }

  static async getById(id) {
    const activity = await ActivityModel.findById(id).lean();
    if (!activity) return null;
    return { ...activity, id: activity._id };
  }

  static async log({ taskId, action, details = null, actor = 'User' }) {
    const activity = await ActivityModel.create({
      task_id: taskId,
      action,
      details,
      actor
    });
    return this.getById(activity._id);
  }

  static async deleteByTaskId(taskId) {
    const result = await ActivityModel.deleteMany({ task_id: taskId });
    return result.deletedCount;
  }

  // Common activity logging helpers
  static logCreated(taskId, actor = 'User') {
    return this.log({
      taskId,
      action: 'created',
      details: 'Task was created',
      actor
    });
  }

  static logUpdated(taskId, changes, actor = 'User') {
    return this.log({
      taskId,
      action: 'updated',
      details: changes,
      actor
    });
  }

  static logMoved(taskId, fromColumn, toColumn, actor = 'User') {
    return this.log({
      taskId,
      action: 'moved',
      details: `Moved from "${fromColumn}" to "${toColumn}"`,
      actor
    });
  }

  static logPriorityChanged(taskId, oldPriority, newPriority, actor = 'User') {
    return this.log({
      taskId,
      action: 'priority_changed',
      details: `Priority changed from "${oldPriority}" to "${newPriority}"`,
      actor
    });
  }

  static logDueDateChanged(taskId, oldDate, newDate, actor = 'User') {
    const oldStr = oldDate || 'none';
    const newStr = newDate || 'none';
    return this.log({
      taskId,
      action: 'due_date_changed',
      details: `Due date changed from "${oldStr}" to "${newStr}"`,
      actor
    });
  }

  static logLabelAdded(taskId, labelName, actor = 'User') {
    return this.log({
      taskId,
      action: 'label_added',
      details: `Label "${labelName}" was added`,
      actor
    });
  }

  static logLabelRemoved(taskId, labelName, actor = 'User') {
    return this.log({
      taskId,
      action: 'label_removed',
      details: `Label "${labelName}" was removed`,
      actor
    });
  }

  static logNoteAdded(taskId, actor = 'User') {
    return this.log({
      taskId,
      action: 'note_added',
      details: 'A note was added',
      actor
    });
  }

  static logNoteDeleted(taskId, actor = 'User') {
    return this.log({
      taskId,
      action: 'note_deleted',
      details: 'A note was deleted',
      actor
    });
  }
}
