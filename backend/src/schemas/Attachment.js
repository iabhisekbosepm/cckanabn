import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'link'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

attachmentSchema.virtual('id').get(function() {
  return this._id;
});

attachmentSchema.set('toJSON', { virtuals: true });
attachmentSchema.set('toObject', { virtuals: true });

// Index
attachmentSchema.index({ task_id: 1 });

export const AttachmentModel = mongoose.model('Attachment', attachmentSchema);
