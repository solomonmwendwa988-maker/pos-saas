import { Component } from 'react';
import { AlertOctagon, Home, RefreshCw } from 'lucide-react';
import Button from './Button';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Report to your monitoring service (Sentry, etc.) here.
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="err-boundary">
        <div className="err-boundary-card">
          <span className="err-icon"><AlertOctagon size={26} /></span>
          <h1>Something went wrong</h1>
          <p>
            The page ran into an unexpected problem. You can try again or go back
            to the dashboard. If it keeps happening, contact support.
          </p>
          <div className="err-actions">
            <Button variant="outline" leftIcon={<Home size={14} />} onClick={() => { window.location.href = '/dashboard'; }}>
              Go to dashboard
            </Button>
            <Button leftIcon={<RefreshCw size={14} />} onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </div>

        <style>{`
          .err-boundary {
            min-height: 100vh; display: flex; align-items: center; justify-content: center;
            background: var(--bg); padding: 24px;
          }
          .err-boundary-card {
            background: #fff; border: 1px solid var(--border); border-radius: var(--r-xl);
            max-width: 480px; width: 100%; padding: 40px 32px; text-align: center;
            box-shadow: var(--shadow-md);
            display: flex; flex-direction: column; gap: 14px; align-items: center;
          }
          .err-icon {
            width: 60px; height: 60px; border-radius: 18px;
            background: var(--danger-bg); color: var(--danger);
            display: flex; align-items: center; justify-content: center;
          }
          .err-boundary-card h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; margin: 4px 0 0; }
          .err-boundary-card p { color: var(--text-muted); font-size: 13.5px; line-height: 1.65; margin: 0; max-width: 360px; }
          .err-actions { display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap; justify-content: center; }
        `}</style>
      </div>
    );
  }
}