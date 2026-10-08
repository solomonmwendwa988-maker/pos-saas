import './Card.css';

export default function Card({
  title, subtitle, action, padding = 'md', children, className = '', ...rest
}) {
  return (
    <div className={`card card-pad-${padding} ${className}`} {...rest}>
      {(title || action) && (
        <div className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}