// OTPInput.jsx
import { useEffect, useRef } from 'react';
import './OTPInput.css';

export default function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}) {
  const refs = useRef([]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const setChar = (idx, ch) => {
    const chars = value.padEnd(length, ' ').split('');
    chars[idx] = ch;
    const next = chars.join('').replace(/\s+$/g, '');
    onChange(next.replace(/[^\d]/g, ''));
  };

  const handleChange = (idx, raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) { setChar(idx, ''); return; }
    if (digits.length > 1) {
      const chars = value.padEnd(length, ' ').split('');
      for (let i = 0; i < digits.length && idx + i < length; i++) chars[idx + i] = digits[i];
      onChange(chars.join('').replace(/\s+$/g, ''));
      refs.current[Math.min(idx + digits.length, length - 1)]?.focus();
      return;
    }
    setChar(idx, digits);
    if (idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handlePaste = e => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="otp">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] || ''}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          className="otp-cell"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}