import mongoose from 'mongoose';

const labelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  color: {
    type: String,
    default: '#6B7280'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: false }
});

labelSchema.virtual('id').get(function() {
  return this._id;
});

labelSchema.set('toJSON', { virtuals: true });
labelSchema.set('toObject', { virtuals: true });

export const LabelModel = mongoose.model('Label', labelSchema);
