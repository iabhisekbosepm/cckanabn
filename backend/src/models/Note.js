import { NoteModel } from '../schemas/Note.js';

export class Note {
  static async getByTaskId(taskId) {
    const notes = await NoteModel.find({ task_id: taskId })
      .sort({ created_at: -1 })
      .lean();
    return notes.map(n => ({ ...n, id: n._id }));
  }

  static async getById(id) {
    const note = await NoteModel.findById(id).lean();
    if (!note) return null;
    return { ...note, id: note._id };
  }

  static async create({ taskId, content, author = 'User' }) {
    const note = await NoteModel.create({
      task_id: taskId,
      content,
      author
    });
    return this.getById(note._id);
  }

  static async update(id, { content }) {
    await NoteModel.findByIdAndUpdate(id, { content });
    return this.getById(id);
  }

  static async delete(id) {
    const result = await NoteModel.findByIdAndDelete(id);
    return result !== null;
  }

  static async deleteByTaskId(taskId) {
    const result = await NoteModel.deleteMany({ task_id: taskId });
    return result.deletedCount;
  }

  static async getCount(taskId) {
    return NoteModel.countDocuments({ task_id: taskId });
  }
}
