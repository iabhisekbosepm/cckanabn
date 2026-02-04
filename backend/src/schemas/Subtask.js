import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  position: {
    type: Number,
    required: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

subtaskSchema.virtual('id').get(function() {
  return this._id;
});

subtaskSchema.set('toJSON', { virtuals: true });
subtaskSchema.set('toObject', { virtuals: true });

// Indexes
subtaskSchema.index({ task_id: 1, position: 1 });

export const SubtaskModel = mongoose.model('Subtask', subtaskSchema);
