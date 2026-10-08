import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export default function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.variant] || Info;
  return (
    <div className={`toast toast-${toast.variant} fade-up`} role="status">
      <span className="toast-icon"><Icon size={16} /></span>
      <div className="toast-body">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-msg">{toast.message}</div>
      </div>
      <button className="toast-close" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}