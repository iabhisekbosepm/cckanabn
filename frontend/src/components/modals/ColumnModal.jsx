import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import ColorPicker from '../ui/ColorPicker';
import Button from '../ui/Button';

function ColumnModal({ isOpen, onClose, onSubmit, column }) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#E5E7EB'
  });

  useEffect(() => {
    if (column) {
      setFormData({
        name: column.name || '',
        color: column.color || '#E5E7EB'
      });
    } else {
      setFormData({
        name: '',
        color: '#E5E7EB'
      });
    }
  }, [column, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={column ? 'Edit Column' : 'Add Column'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Column Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., To Do, In Progress, Done"
          required
          autoFocus
        />

        <ColorPicker
          label="Color"
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color })}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {column ? 'Save Changes' : 'Add Column'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ColumnModal;
