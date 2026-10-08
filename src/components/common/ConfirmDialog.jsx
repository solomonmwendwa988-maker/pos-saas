import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
  open, onClose, onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  variant = 'danger',
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>
    </Modal>
  );
}