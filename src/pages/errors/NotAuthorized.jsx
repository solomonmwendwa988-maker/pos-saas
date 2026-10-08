import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Button from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/config/permissions';
import './NotAuthorized.css';

export default function NotAuthorized() {
  const nav = useNavigate();
  const { role } = useAuth();

  return (
    <div className="na">
      <div className="na-card fade-up">
        <span className="na-icon"><ShieldAlert size={26} /></span>
        <h1 className="na-title">Access restricted</h1>
        <p className="na-text">
          Your account role doesn't have permission to view this page.
          {role && (
            <>
              {' '}You are signed in as a{' '}
              <strong>{ROLE_LABELS[role] || role}</strong>.
            </>
          )}
        </p>
        <p className="na-hint">
          If you believe you should have access, contact the owner of this
          workspace.
        </p>
        <div className="na-actions">
          <Button
            variant="outline"
            leftIcon={<ArrowLeft size={14} />}
            onClick={() => nav(-1)}
          >
            Go back
          </Button>
          <Link to={role === 'CASHIER' ? '/pos' : '/dashboard'}>
            <Button>Go to home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}