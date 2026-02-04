import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  color: {
    type: String,
    default: '#E5E7EB'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

columnSchema.virtual('id').get(function() {
  return this._id;
});

columnSchema.set('toJSON', { virtuals: true });
columnSchema.set('toObject', { virtuals: true });

// Index for efficient queries
columnSchema.index({ project_id: 1, position: 1 });

export const ColumnModel = mongoose.model('Column', columnSchema);
