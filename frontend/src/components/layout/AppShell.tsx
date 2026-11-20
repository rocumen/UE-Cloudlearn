import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  Cloud,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Users,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { UserRole } from '../../types/api';
import { useToast } from '../ui/ToastProvider';

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator'
};

const NAV_ITEMS_BY_ROLE: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Courses', to: '/courses', icon: BookOpen },
    { label: 'Learning records', to: '/records', icon: Award }
  ],
  instructor: [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'My courses', to: '/courses', icon: BookOpen },
    { label: 'Submissions', to: '/submissions', icon: FileCheck2 }
  ],
  admin: [
    { label: 'Overview', to: '/', icon: LayoutDashboard },
    { label: 'Courses', to: '/courses', icon: BookOpen },
    { label: 'Users', to: '/users', icon: Users }
  ]
};

function isNavItemActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/';
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const role: UserRole = user?.role ?? 'student';
  const navItems = NAV_ITEMS_BY_ROLE[role];
  const themeToggleLabel =
    theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
      showToast({ title: 'You have signed out.', variant: 'info' });
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-primary lg:flex">
      {/* Desktop Left Sidebar (>= 1024px) */}
      <aside
        aria-label="Workspace navigation"
        className="hidden lg:flex lg:w-[248px] lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-screen bg-surface border-r border-hairline px-4 py-6"
      >
        <Link
          to="/"
          className="flex min-h-[44px] items-center gap-3 rounded-[12px] px-2 apple-transition apple-focus-ring"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
            <Cloud className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="block truncate text-[1.0625rem] font-semibold tracking-[-0.01em] text-primary">
              UE Cloudlearn
            </span>
            <span className="block truncate text-[0.8125rem] text-secondary">
              {ROLE_LABELS[role]}
            </span>
          </div>
        </Link>

        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(location.pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-[44px] items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] font-medium apple-transition apple-focus-ring',
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-secondary hover:bg-subtle hover:text-primary'
                ].join(' ')}
              >
                <Icon
                  className="h-5 w-5 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 border-t border-hairline pt-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={themeToggleLabel}
            className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] px-3 text-[0.9375rem] font-medium text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
          >
            <span className="flex items-center gap-3">
              {theme === 'light' ? (
                <Moon
                  className="h-5 w-5 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <Sun
                  className="h-5 w-5 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
              <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </span>
          </button>

          {user ? (
            <div className="rounded-[12px] bg-subtle px-3 py-2.5">
              <p className="truncate text-[0.875rem] font-semibold text-primary">
                {user.fullName}
              </p>
              <p className="truncate text-[0.8125rem] text-secondary">
                {user.email}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] px-3 text-[0.9375rem] font-medium text-secondary hover:bg-status-error-bg hover:text-status-error-fg apple-transition apple-focus-ring disabled:opacity-50"
          >
            <LogOut
              className="h-5 w-5 shrink-0"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Sticky Header (< 1024px) */}
        <header className="sticky top-0 z-30 flex min-h-[56px] items-center justify-between border-b border-hairline px-4 apple-backdrop-bar lg:hidden">
          <Link
            to="/"
            className="flex min-h-[44px] items-center gap-2.5 rounded-[10px] pr-2 apple-transition apple-focus-ring"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
              <Cloud
                className="h-[18px] w-[18px]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </span>
            <span className="text-[1rem] font-semibold tracking-[-0.01em] text-primary">
              UE Cloudlearn
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeToggleLabel}
              className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
            >
              {theme === 'light' ? (
                <Moon
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <Sun
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              aria-label="Sign out"
              className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] text-secondary hover:bg-status-error-bg hover:text-status-error-fg apple-transition apple-focus-ring disabled:opacity-50"
            >
              <LogOut
                className="h-5 w-5"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pt-6 pb-24 lg:px-8 lg:py-8">
          {children}
        </main>

        {/* Mobile Bottom Tab Bar (< 1024px) */}
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline apple-backdrop-bar lg:hidden"
        >
          <div className="mx-auto grid h-[64px] max-w-[640px] grid-cols-3 items-center gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isNavItemActive(location.pathname, item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-1 rounded-[12px] px-1 text-[0.75rem] font-medium leading-none apple-transition apple-focus-ring',
                    active
                      ? 'text-accent'
                      : 'text-secondary hover:text-primary'
                  ].join(' ')}
                >
                  <Icon
                    className="h-5 w-5 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <span className="truncate max-w-full">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
