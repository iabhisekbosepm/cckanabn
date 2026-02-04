import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String,
    default: null
  },
  actor: {
    type: String,
    default: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

activitySchema.virtual('id').get(function() {
  return this._id;
});

activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

// Indexes
activitySchema.index({ task_id: 1 });
activitySchema.index({ created_at: -1 });

export const ActivityModel = mongoose.model('Activity', activitySchema);
