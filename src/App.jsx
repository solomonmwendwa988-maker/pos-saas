import { AuthProvider } from '@/context/AuthContext';
import { BusinessProvider } from '@/context/BusinessContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';
import { ShiftProvider } from '@/context/ShiftContext';
import { ToastProvider } from '@/context/ToastContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BusinessProvider>
          <ToastProvider>
            <NotificationProvider>
              <SubscriptionProvider>
                <ShiftProvider>
                  <AppRoutes />
                </ShiftProvider>
              </SubscriptionProvider>
            </NotificationProvider>
          </ToastProvider>
        </BusinessProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}