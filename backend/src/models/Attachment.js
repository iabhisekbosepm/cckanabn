import { AttachmentModel } from '../schemas/Attachment.js';

export class Attachment {
  static async getByTaskId(taskId) {
    const attachments = await AttachmentModel.find({ task_id: taskId })
      .sort({ created_at: -1 })
      .lean();
    return attachments.map(a => ({ ...a, id: a._id }));
  }

  static async getById(id) {
    const attachment = await AttachmentModel.findById(id).lean();
    if (!attachment) return null;
    return { ...attachment, id: attachment._id };
  }

  static async create({ taskId, title, url, type = 'link' }) {
    const attachment = await AttachmentModel.create({
      task_id: taskId,
      title,
      url,
      type
    });
    return this.getById(attachment._id);
  }

  static async update(id, { title, url }) {
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (url !== undefined) updateData.url = url;

    if (Object.keys(updateData).length === 0) {
      return this.getById(id);
    }

    await AttachmentModel.findByIdAndUpdate(id, updateData);
    return this.getById(id);
  }

  static async delete(id) {
    const result = await AttachmentModel.findByIdAndDelete(id);
    return result !== null;
  }

  static async deleteByTaskId(taskId) {
    const result = await AttachmentModel.deleteMany({ task_id: taskId });
    return result.deletedCount;
  }

  static async getCount(taskId) {
    return AttachmentModel.countDocuments({ task_id: taskId });
  }

  // Detect link type from URL
  static detectType(url) {
    const lowercaseUrl = url.toLowerCase();

    if (lowercaseUrl.includes('github.com')) return 'github';
    if (lowercaseUrl.includes('gitlab.com')) return 'gitlab';
    if (lowercaseUrl.includes('figma.com')) return 'figma';
    if (lowercaseUrl.includes('notion.so') || lowercaseUrl.includes('notion.site')) return 'notion';
    if (lowercaseUrl.includes('docs.google.com')) return 'google-docs';
    if (lowercaseUrl.includes('drive.google.com')) return 'google-drive';
    if (lowercaseUrl.includes('dropbox.com')) return 'dropbox';
    if (lowercaseUrl.includes('trello.com')) return 'trello';
    if (lowercaseUrl.includes('jira.')) return 'jira';
    if (lowercaseUrl.includes('slack.com')) return 'slack';
    if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) return 'youtube';
    if (lowercaseUrl.includes('loom.com')) return 'loom';
    if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowercaseUrl)) return 'image';
    if (/\.(pdf)$/i.test(lowercaseUrl)) return 'pdf';
    if (/\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(lowercaseUrl)) return 'document';

    return 'link';
  }
}
