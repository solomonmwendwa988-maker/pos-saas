import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './Input.css';

const Input = forwardRef(function Input(
  { label, error, hint, leftIcon, rightSlot, password, className = '', id, ...rest },
  ref
) {
  const [show, setShow] = useState(false);
  const inputId = id || rest.name;

  return (
    <div className={`field ${error ? 'field-error' : ''} ${className}`}>
      {label && <label htmlFor={inputId} className="field-label">{label}</label>}
      <div className="field-control">
        {leftIcon && <span className="field-left">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          className="field-input"
          type={password ? (show ? 'text' : 'password') : rest.type}
          {...rest}
        />
        {password && (
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShow(s => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        {!password && rightSlot && <span className="field-right">{rightSlot}</span>}
      </div>
      {error ? (
        <span className="field-error-msg">{error}</span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </div>
  );
});

export default Input;