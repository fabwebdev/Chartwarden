'use client';

import { ReactNode } from 'react';
import { useAbility, Can } from 'contexts/AbilityContext';
import { CaslAction, CaslSubject } from '@chartwarden/types';

// Re-export Can from CASL React for declarative usage
export { Can };

/**
 * Props for CanAccess component
 */
interface CanAccessProps {
  /** The CASL action to check (e.g., 'read', 'create', 'update', 'delete') */
  action: CaslAction;
  /** The CASL subject to check (e.g., 'Patient', 'Medication') */
  subject: CaslSubject;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Optional fallback content when user lacks permission */
  fallback?: ReactNode;
  /** When true, check that user CANNOT perform the action */
  not?: boolean;
}

/**
 * CanAccess - Conditional rendering based on CASL permissions
 *
 * @example
 * // Basic usage - show button only if user can create patients
 * <CanAccess action="create" subject="Patient">
 *   <Button>Add Patient</Button>
 * </CanAccess>
 *
 * @example
 * // With fallback
 * <CanAccess action="delete" subject="Patient" fallback={<span>No permission</span>}>
 *   <DeleteButton />
 * </CanAccess>
 *
 * @example
 * // Inverted check - show only if user CANNOT perform action
 * <CanAccess action="manage" subject="Settings" not>
 *   <span>Contact admin for settings access</span>
 * </CanAccess>
 */
export function CanAccess({
  action,
  subject,
  children,
  fallback = null,
  not = false,
}: CanAccessProps) {
  const { can, cannot } = useAbility();

  const hasPermission = not ? cannot(action, subject) : can(action, subject);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Props for CannotAccess component
 */
interface CannotAccessProps {
  /** The CASL action to check */
  action: CaslAction;
  /** The CASL subject to check */
  subject: CaslSubject;
  /** Content to render if user lacks permission */
  children: ReactNode;
}

/**
 * CannotAccess - Render content when user lacks permission
 *
 * @example
 * <CannotAccess action="manage" subject="Settings">
 *   <Alert severity="warning">You don't have admin access</Alert>
 * </CannotAccess>
 */
export function CannotAccess({ action, subject, children }: CannotAccessProps) {
  const { cannot } = useAbility();

  return cannot(action, subject) ? <>{children}</> : null;
}

/**
 * Props for RequirePermission component
 */
interface RequirePermissionProps {
  /** The CASL action required */
  action: CaslAction;
  /** The CASL subject to check */
  subject: CaslSubject;
  /** Content to render if user has permission */
  children: ReactNode;
  /** Content to render when user lacks permission (defaults to null) */
  unauthorized?: ReactNode;
}

/**
 * RequirePermission - Wrapper that requires a specific permission
 * Useful for wrapping entire sections or pages
 *
 * @example
 * <RequirePermission
 *   action="manage"
 *   subject="Settings"
 *   unauthorized={<AccessDenied />}
 * >
 *   <SettingsPanel />
 * </RequirePermission>
 */
export function RequirePermission({
  action,
  subject,
  children,
  unauthorized = null,
}: RequirePermissionProps) {
  const { can } = useAbility();

  return can(action, subject) ? <>{children}</> : <>{unauthorized}</>;
}

/**
 * HOC to wrap components with permission check
 *
 * @example
 * const ProtectedButton = withPermission(
 *   Button,
 *   'create',
 *   'Patient'
 * );
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  action: CaslAction,
  subject: CaslSubject,
  FallbackComponent?: React.ComponentType
) {
  return function WithPermissionComponent(props: P) {
    const { can } = useAbility();

    if (!can(action, subject)) {
      return FallbackComponent ? <FallbackComponent /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

export default CanAccess;
