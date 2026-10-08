import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Wraps a route subtree and enforces a permission.
 *
 *   <Route element={<RequireRole action="reports.view" />}>
 *     <Route path="/reports" element={<Reports />} />
 *   </Route>
 *
 * Redirects to /unauthorized if the current role lacks the permission.
 */
export default function RequireRole({ action, anyOf, allOf }) {
  const { can, canAny, canAll, isAuthenticated } = useAuth();
  const loc = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }

  let allowed = true;
  if (action) allowed = can(action);
  else if (anyOf) allowed = canAny(anyOf);
  else if (allOf) allowed = canAll(allOf);

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}