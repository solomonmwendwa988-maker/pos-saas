import { useAuth } from '@/context/AuthContext';

/**
 * Renders `children` only when the current role has the required
 * permission. Otherwise renders `fallback` (null by default).
 *
 *   <RoleGate action="products.delete">
 *     <button onClick={deleteProduct}>Delete</button>
 *   </RoleGate>
 *
 *   <RoleGate anyOf={['sales.refund']} fallback={<span>Read-only</span>}>
 *     ...
 *   </RoleGate>
 */
export default function RoleGate({
  action,
  anyOf,
  allOf,
  fallback = null,
  children,
}) {
  const { can, canAny, canAll } = useAuth();

  let allowed = true;
  if (action) allowed = can(action);
  else if (anyOf) allowed = canAny(anyOf);
  else if (allOf) allowed = canAll(allOf);

  return allowed ? children : fallback;
}