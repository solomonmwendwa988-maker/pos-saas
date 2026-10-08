import { createContext, useCallback, useContext, useState } from 'react';
import Toast from '@/components/common/Toast';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback(id => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((variant, message, opts = {}) => {
    const id = nextId++;
    const duration = opts.duration ?? 4000;
    setToasts(prev => [...prev, { id, variant, message, title: opts.title }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const api = {
    show: (msg, opts) => push('info', msg, opts),
    success: (msg, opts) => push('success', msg, opts),
    error: (msg, opts) => push('error', msg, opts),
    warning: (msg, opts) => push('warning', msg, opts),
    info: (msg, opts) => push('info', msg, opts),
    dismiss: remove,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map(t => (
          <Toast key={t.id} toast={t} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}