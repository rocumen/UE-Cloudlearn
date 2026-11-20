/**
 * Screen A: Sign In (/login)
 * Purpose: Authenticate existing users into their UE Cloudlearn workspace.
 * Single primary action: "Sign in".
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Cloud, Eye, EyeOff, Moon, Sun } from 'lucide-react';
import {
  Button,
  Card,
  ErrorBanner,
  Input,
  Skeleton,
  useToast
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ApiError } from '../lib/api';
import { getDisplayFirstName } from '../lib/formatters';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="w-full max-w-[420px]">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="mt-6 h-7 w-48" />
          <Skeleton className="mt-2 h-5 w-64" />
          <Skeleton className="mt-6 h-12 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-6 h-12 w-full" />
        </Card>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.';
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const signedInUser = await login({
        email: email.trim().toLowerCase(),
        password
      });
      showToast({
        title: `Welcome back, ${getDisplayFirstName(signedInUser.fullName)}.`,
        variant: 'success'
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details.length > 0) {
          const mapped: { email?: string; password?: string } = {};
          for (const detail of err.details) {
            if (detail.field === 'email' || detail.field === 'password') {
              mapped[detail.field] = detail.message;
            }
          }
          setFieldErrors(mapped);
        }
        setFormError(
          err.code === 'INVALID_CREDENTIALS'
            ? 'Incorrect email or password. Try again.'
            : err.message
        );
      } else {
        setFormError('Something went wrong while signing in. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-canvas text-primary flex flex-col justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
          }
          className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] border border-hairline bg-surface text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
        >
          {theme === 'light' ? (
            <Moon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Sun className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      <main className="mx-auto w-full max-w-[420px]">
        <Card padding="lg">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-accent-soft text-accent">
              <Cloud className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-primary">
              UE Cloudlearn
            </span>
          </div>

          <div className="mt-6">
            <h1 className="text-[1.5rem] font-bold tracking-[-0.02em] text-primary">
              Welcome back
            </h1>
            <p className="mt-1 text-[0.9375rem] text-secondary">
              Sign in to your UE Cloudlearn workspace.
            </p>
          </div>

          {formError ? (
            <ErrorBanner message={formError} className="mt-5" />
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="name@ue.edu.ph"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              error={fieldErrors.email}
              disabled={submitting}
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              error={fieldErrors.password}
              disabled={submitting}
              trailingAction={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] text-secondary hover:text-primary apple-transition apple-focus-ring"
                >
                  {showPassword ? (
                    <EyeOff
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                </button>
              }
            />

            <div className="pt-2">
              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={submitting}
                loadingText="Signing in..."
              >
                Sign in
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/register"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-3 text-[0.9375rem] text-secondary hover:bg-subtle apple-transition apple-focus-ring"
            >
              <span>New student?</span>
              <span className="ml-1 font-medium text-accent">
                Create an account
              </span>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
