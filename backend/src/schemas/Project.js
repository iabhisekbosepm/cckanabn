import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#3B82F6'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Virtual for id (to maintain compatibility with SQLite integer IDs)
projectSchema.virtual('id').get(function() {
  return this._id;
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

export const ProjectModel = mongoose.model('Project', projectSchema);
