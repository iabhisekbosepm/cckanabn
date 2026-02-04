import Modal from '../ui/Modal';
import Button from '../ui/Button';

function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Delete'}>
      <p className="text-gray-600 mb-6">
        {message || 'Are you sure you want to delete this item? This action cannot be undone.'}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}

export default DeleteConfirmModal;
