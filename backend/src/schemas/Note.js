import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

noteSchema.virtual('id').get(function() {
  return this._id;
});

noteSchema.set('toJSON', { virtuals: true });
noteSchema.set('toObject', { virtuals: true });

// Index
noteSchema.index({ task_id: 1 });

export const NoteModel = mongoose.model('Note', noteSchema);
