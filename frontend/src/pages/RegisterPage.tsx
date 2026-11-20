/**
 * Screen A2: Create Account (/register)
 * Purpose: Register a new student account in UE Cloudlearn.
 * Single primary action: "Create account".
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RegisterFieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPage() {
  const { user, isLoading, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
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
          <Skeleton className="mt-4 h-12 w-full" />
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
    const nextErrors: RegisterFieldErrors = {};
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      nextErrors.fullName = 'Please enter your full name (at least 2 characters).';
    } else if (trimmedName.length > 120) {
      nextErrors.fullName = 'Full name must be 120 characters or fewer.';
    }

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    } else if (password.length > 72) {
      nextErrors.password = 'Password must be 72 characters or fewer.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
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
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password
      });
      showToast({
        title: 'Account created. Welcome to UE Cloudlearn.',
        variant: 'success'
      });
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS' || err.status === 409) {
          setFieldErrors((prev) => ({
            ...prev,
            email: 'An account with this email already exists.'
          }));
          setFormError('That email is already registered. Sign in instead.');
        } else {
          if (err.details.length > 0) {
            const mapped: RegisterFieldErrors = {};
            for (const detail of err.details) {
              if (
                detail.field === 'fullName' ||
                detail.field === 'email' ||
                detail.field === 'password'
              ) {
                mapped[detail.field] = detail.message;
              }
            }
            setFieldErrors(mapped);
          }
          setFormError(err.message);
        }
      } else {
        setFormError('Something went wrong creating your account. Try again.');
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
              Create your account
            </h1>
            <p className="mt-1 text-[0.9375rem] text-secondary">
              Join UE Cloudlearn as a student.
            </p>
          </div>

          {formError ? (
            <ErrorBanner message={formError} className="mt-5" />
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              placeholder="Juan Dela Cruz"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                if (fieldErrors.fullName) {
                  setFieldErrors((prev) => ({ ...prev, fullName: undefined }));
                }
              }}
              error={fieldErrors.fullName}
              disabled={submitting}
            />

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
              autoComplete="new-password"
              placeholder="Create a password"
              helperText="At least 8 characters."
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

            <Input
              label="Confirm password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined
                  }));
                }
              }}
              error={fieldErrors.confirmPassword}
              disabled={submitting}
              trailingAction={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                  className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px] text-secondary hover:text-primary apple-transition apple-focus-ring"
                >
                  {showConfirmPassword ? (
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
                loadingText="Creating account..."
              >
                Create account
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-3 text-[0.9375rem] text-secondary hover:bg-subtle apple-transition apple-focus-ring"
            >
              <span>Already have an account?</span>
              <span className="ml-1 font-medium text-accent">Sign in</span>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
