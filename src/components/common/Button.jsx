import { Loader2 } from 'lucide-react';
import './Button.css';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  full = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${full ? 'btn-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="btn-spin" size={16} /> : leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
}