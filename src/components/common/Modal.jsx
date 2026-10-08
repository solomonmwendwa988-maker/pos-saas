// Modal.jsx
import { X } from 'lucide-react';
import { useEffect } from 'react';
import './Modal.css';

export default function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-scrim fade-in" onClick={onClose}>
      <div className={`modal modal-${size} fade-up`} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}