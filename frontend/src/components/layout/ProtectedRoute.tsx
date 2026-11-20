import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/api';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useToast } from '../ui/ToastProvider';

export interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({
  allowedRoles,
  children
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const notifiedDeniedRef = useRef<string | null>(null);

  const isRoleBlocked = Boolean(
    !isLoading &&
      user &&
      allowedRoles &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(user.role)
  );

  useEffect(() => {
    if (isRoleBlocked && notifiedDeniedRef.current !== location.pathname) {
      notifiedDeniedRef.current = location.pathname;
      showToast({
        title: 'That page is not available for your role.',
        variant: 'info'
      });
    }
  }, [isRoleBlocked, location.pathname, showToast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas p-4 lg:p-8">
        <div className="mx-auto max-w-[1040px] space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-11 w-36" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-9 w-16" />
            </Card>
            <Card>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-9 w-16" />
            </Card>
            <Card>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-9 w-16" />
            </Card>
          </div>
          <Card>
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isRoleBlocked) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
