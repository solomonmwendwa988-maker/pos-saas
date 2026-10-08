// PasswordStrength.jsx
import './PasswordStrength.css';

export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: v => v.length >= 8 },
  { label: 'One uppercase letter', test: v => /[A-Z]/.test(v) },
  { label: 'One lowercase letter', test: v => /[a-z]/.test(v) },
  { label: 'One number', test: v => /\d/.test(v) },
  { label: 'One special character', test: v => /[^A-Za-z0-9]/.test(v) },
];

export function passwordScore(v) {
  return PASSWORD_RULES.reduce((n, r) => n + (r.test(v) ? 1 : 0), 0);
}

export default function PasswordStrength({ value }) {
  const score = passwordScore(value);
  const levels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const tone = score <= 1 ? 'danger' : score <= 2 ? 'warning' : score <= 3 ? 'info' : 'success';

  return (
    <div className="pw">
      <div className="pw-bar">
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className={`pw-seg pw-${i <= score ? tone : 'empty'}`} />
        ))}
      </div>
      {value && <div className={`pw-label pw-label-${tone}`}>{levels[score] || 'Very weak'}</div>}
      <ul className="pw-rules">
        {PASSWORD_RULES.map(r => {
          const ok = r.test(value);
          return (
            <li key={r.label} className={ok ? 'ok' : ''}>
              <span className="pw-dot" />
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}