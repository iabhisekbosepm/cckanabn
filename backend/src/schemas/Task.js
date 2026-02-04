import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  column_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Column',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  position: {
    type: Number,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  due_date: {
    type: Date,
    default: null
  },
  labels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Label'
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

taskSchema.virtual('id').get(function() {
  return this._id;
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

// Indexes
taskSchema.index({ column_id: 1, position: 1 });
taskSchema.index({ due_date: 1 });

export const TaskModel = mongoose.model('Task', taskSchema);
