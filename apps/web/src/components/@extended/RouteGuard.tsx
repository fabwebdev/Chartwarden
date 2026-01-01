'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAbility } from 'contexts/AbilityContext';
import { useAuthStore } from 'store/authStore';
import { CaslAction, CaslSubject } from '@chartwarden/types';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';

/**
 * Props for RouteGuard component
 */
interface RouteGuardProps {
  /** Required action for this route */
  action: CaslAction;
  /** Required subject for this route */
  subject: CaslSubject;
  /** Content to render if authorized */
  children: ReactNode;
  /** Redirect path when unauthorized (defaults to /unauthorized) */
  redirectTo?: string;
  /** Whether to redirect or show access denied message */
  mode?: 'redirect' | 'block';
  /** Custom loading component */
  loadingComponent?: ReactNode;
  /** Custom access denied component */
  accessDeniedComponent?: ReactNode;
}

/**
 * Default loading component
 */
function DefaultLoading() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="textSecondary">
        Checking permissions...
      </Typography>
    </Box>
  );
}

/**
 * Default access denied component
 */
function DefaultAccessDenied({ onGoBack }: { onGoBack: () => void }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: 2,
        p: 3,
      }}
    >
      <Alert severity="error" sx={{ maxWidth: 400 }}>
        <Typography variant="h6" gutterBottom>
          Access Denied
        </Typography>
        <Typography variant="body2">
          You do not have permission to access this page. Please contact your administrator if you believe this is an error.
        </Typography>
      </Alert>
      <Button variant="outlined" onClick={onGoBack}>
        Go Back
      </Button>
    </Box>
  );
}

/**
 * RouteGuard - Protects routes based on CASL permissions
 *
 * @example
 * // Redirect mode (default) - redirects to /unauthorized
 * <RouteGuard action="manage" subject="Settings">
 *   <SettingsPage />
 * </RouteGuard>
 *
 * @example
 * // Block mode - shows access denied message
 * <RouteGuard action="view" subject="Analytics" mode="block">
 *   <AnalyticsDashboard />
 * </RouteGuard>
 *
 * @example
 * // Custom redirect path
 * <RouteGuard action="create" subject="Patient" redirectTo="/patients">
 *   <NewPatientForm />
 * </RouteGuard>
 */
export function RouteGuard({
  action,
  subject,
  children,
  redirectTo = '/unauthorized',
  mode = 'redirect',
  loadingComponent,
  accessDeniedComponent,
}: RouteGuardProps) {
  const router = useRouter();
  const { can } = useAbility();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for auth to initialize
    if (!isInitialized) {
      return;
    }

    // Check authorization
    const hasPermission = can(action, subject);
    setIsAuthorized(hasPermission);
    setIsChecking(false);

    // Handle redirect mode
    if (mode === 'redirect' && !hasPermission && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isAuthenticated, action, subject, can, mode, redirectTo, router]);

  // Show loading while checking
  if (isChecking || !isInitialized) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  // Not authenticated - let the auth guard handle this
  if (!isAuthenticated) {
    return <>{loadingComponent || <DefaultLoading />}</>;
  }

  // Authorized - render children
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Not authorized - block mode shows access denied
  if (mode === 'block') {
    return (
      <>
        {accessDeniedComponent || (
          <DefaultAccessDenied onGoBack={() => router.back()} />
        )}
      </>
    );
  }

  // Redirect mode - show loading while redirecting
  return <>{loadingComponent || <DefaultLoading />}</>;
}

/**
 * Props for MultiPermissionGuard
 */
interface MultiPermissionGuardProps {
  /** Array of required permissions - user must have ALL or ANY based on mode */
  permissions: Array<{ action: CaslAction; subject: CaslSubject }>;
  /** Whether user needs ALL permissions or just ANY one */
  requireAll?: boolean;
  /** Content to render if authorized */
  children: ReactNode;
  /** Fallback content when unauthorized */
  fallback?: ReactNode;
}

/**
 * MultiPermissionGuard - Check multiple permissions at once
 *
 * @example
 * // Require ANY of the listed permissions
 * <MultiPermissionGuard
 *   permissions={[
 *     { action: 'view', subject: 'Analytics' },
 *     { action: 'manage', subject: 'Reports' },
 *   ]}
 * >
 *   <ReportsSection />
 * </MultiPermissionGuard>
 *
 * @example
 * // Require ALL permissions
 * <MultiPermissionGuard
 *   permissions={[
 *     { action: 'create', subject: 'Patient' },
 *     { action: 'update', subject: 'Patient' },
 *   ]}
 *   requireAll
 * >
 *   <PatientManagement />
 * </MultiPermissionGuard>
 */
export function MultiPermissionGuard({
  permissions,
  requireAll = false,
  children,
  fallback = null,
}: MultiPermissionGuardProps) {
  const { can } = useAbility();

  const hasPermission = requireAll
    ? permissions.every((p) => can(p.action, p.subject))
    : permissions.some((p) => can(p.action, p.subject));

  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

export default RouteGuard;
