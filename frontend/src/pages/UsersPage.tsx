/**
 * Screen G: Admin Users Management (/users)
 * Purpose: View, search, filter, create, edit, and delete Student, Instructor, and Admin accounts.
 * Single primary action: "Add user".
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Eye,
  EyeOff,
  Pencil,
  Search,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorBanner,
  Input,
  ModalSheet,
  SegmentedControl,
  Select,
  Skeleton,
  useToast
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../lib/api';
import type { User, UserRole, UserStatus } from '../types/api';

type RoleFilter = 'all' | UserRole;

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
}

interface UserFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator'
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formState, setFormState] = useState<UserFormState>({
    fullName: '',
    email: '',
    password: '',
    role: 'student',
    status: 'active'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<UserFormErrors>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadUsers = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const query = roleFilter !== 'all' ? `?role=${roleFilter}` : '';
        const data = await api.get<{ users: User[] }>(
          `/api/users${query}`,
          signal
        );
        setUsers(data.users);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          "We couldn't load the user directory. Check your connection and try again."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [roleFilter]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (item) =>
        item.fullName.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const openCreateSheet = () => {
    setEditingUser(null);
    setShowPassword(false);
    setFormErrors({});
    setFormBannerError(null);
    setFormState({
      fullName: '',
      email: '',
      password: '',
      role: 'student',
      status: 'active'
    });
    setFormOpen(true);
  };

  const openEditSheet = (target: User) => {
    setEditingUser(target);
    setFormErrors({});
    setFormBannerError(null);
    setFormState({
      fullName: target.fullName,
      email: target.email,
      password: '',
      role: target.role,
      status: target.status
    });
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const nextErrors: UserFormErrors = {};
    const name = formState.fullName.trim();
    if (name.length < 2 || name.length > 120) {
      nextErrors.fullName = 'Full name must be between 2 and 120 characters.';
    }

    if (!editingUser) {
      const email = formState.email.trim().toLowerCase();
      if (!email || !EMAIL_PATTERN.test(email)) {
        nextErrors.email = 'Please enter a valid email address.';
      }
      if (formState.password.length < 8 || formState.password.length > 72) {
        nextErrors.password = 'Password must be between 8 and 72 characters.';
      }
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveUser = async (event: FormEvent) => {
    event.preventDefault();
    setFormBannerError(null);
    if (!validateForm()) return;

    setSavingUser(true);
    try {
      if (editingUser) {
        const isSelf = editingUser.id === currentUser?.id;
        await api.patch<{ user: User }>(`/api/users/${editingUser.id}`, {
          fullName: formState.fullName.trim(),
          ...(isSelf
            ? {}
            : {
                role: formState.role,
                status: formState.status
              })
        });
        showToast({ title: 'User account updated.', variant: 'success' });
      } else {
        await api.post<{ user: User }>('/api/users', {
          fullName: formState.fullName.trim(),
          email: formState.email.trim().toLowerCase(),
          password: formState.password,
          role: formState.role,
          status: formState.status
        });
        showToast({ title: 'User account created.', variant: 'success' });
      }

      setFormOpen(false);
      await loadUsers();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS' || err.status === 409) {
          setFormErrors((prev) => ({
            ...prev,
            email: 'An account with this email already exists.'
          }));
        }
        if (err.details.length > 0) {
          const mapped: UserFormErrors = {};
          for (const detail of err.details) {
            if (
              detail.field === 'fullName' ||
              detail.field === 'email' ||
              detail.field === 'password'
            ) {
              mapped[detail.field] = detail.message;
            }
          }
          setFormErrors((prev) => ({ ...prev, ...mapped }));
        }
        setFormBannerError(err.message);
      } else {
        setFormBannerError('Unable to save user. Please try again.');
      }
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/users/${deleteTarget.id}`);
      showToast({
        title: `Deleted ${deleteTarget.fullName}.`,
        variant: 'success'
      });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete this user. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const isEditingSelf = Boolean(
    editingUser && editingUser.id === currentUser?.id
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-[1.15] text-primary">
              Users
            </h1>
            <p className="mt-1 text-[0.9375rem] text-secondary">
              Manage student, instructor, and administrator accounts.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={openCreateSheet}
            className="self-start sm:self-auto shrink-0"
          >
            <UserPlus
              className="h-4 w-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>Add user</span>
          </Button>
        </div>

        {/* Search & Role Filter */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-[340px]">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search users"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className={[
                'w-full min-h-[48px] rounded-[12px] border border-hairline bg-surface pl-10 text-[0.9375rem] text-primary placeholder:text-secondary apple-transition apple-focus-ring',
                searchQuery ? 'pr-12' : 'pr-3.5'
              ].join(' ')}
            />
            {searchQuery ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-[10px] text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <SegmentedControl
            label="Filter by role"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'student', label: 'Students' },
              { value: 'instructor', label: 'Instructors' },
              { value: 'admin', label: 'Admins' }
            ]}
          />
        </div>

        {/* User List */}
        {loading ? (
          <Card padding="none">
            <div className="divide-y divide-hairline">
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className="p-4 sm:px-6">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          </Card>
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => void loadUsers()} />
        ) : filteredUsers.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title={
                searchQuery
                  ? 'No matching users found'
                  : 'No users in this filter'
              }
              description={
                searchQuery
                  ? 'Try another name or email address.'
                  : 'Add a new user account to get started.'
              }
              action={
                searchQuery ? (
                  <Button
                    variant="secondary"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </Button>
                ) : (
                  <Button variant="primary" onClick={openCreateSheet}>
                    Add user
                  </Button>
                )
              }
            />
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-hairline">
              {filteredUsers.map((account) => {
                const isSelf = account.id === currentUser?.id;

                return (
                  <div
                    key={account.id}
                    className="flex min-h-[64px] flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                        <UserIcon
                          className="h-5 w-5"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[0.9375rem] font-semibold text-primary">
                            {account.fullName}
                          </p>
                          {isSelf ? (
                            <Badge variant="crimson">You</Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-[0.8125rem] text-secondary">
                          {account.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            account.role === 'admin' ? 'crimson' : 'neutral'
                          }
                        >
                          {ROLE_LABELS[account.role]}
                        </Badge>
                        <Badge
                          variant={
                            account.status === 'active' ? 'success' : 'error'
                          }
                        >
                          {account.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Edit ${account.fullName}`}
                          onClick={() => openEditSheet(account)}
                        >
                          <Pencil
                            className="h-4 w-4"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </Button>
                        <Button
                          variant="danger"
                          size="icon"
                          disabled={isSelf}
                          aria-label={
                            isSelf
                              ? 'Cannot delete your own account'
                              : `Delete ${account.fullName}`
                          }
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(account);
                          }}
                        >
                          <Trash2
                            className="h-4 w-4"
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Add / Edit User ModalSheet */}
      <ModalSheet
        open={formOpen}
        onClose={() => (savingUser ? undefined : setFormOpen(false))}
        title={editingUser ? 'Edit user' : 'Add user'}
        subtitle={
          editingUser
            ? 'Update profile details, role, or account status.'
            : 'Provision a new Student, Instructor, or Administrator account.'
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={savingUser}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="user-form"
              variant="primary"
              isLoading={savingUser}
              loadingText={editingUser ? 'Saving...' : 'Creating...'}
              className="w-full sm:w-auto"
            >
              {editingUser ? 'Save changes' : 'Create user'}
            </Button>
          </>
        }
      >
        <form
          id="user-form"
          onSubmit={handleSaveUser}
          noValidate
          className="space-y-4"
        >
          {formBannerError ? <ErrorBanner message={formBannerError} /> : null}

          <Input
            label="Full name"
            placeholder="Marco Santos"
            value={formState.fullName}
            onChange={(event) => {
              setFormState((prev) => ({
                ...prev,
                fullName: event.target.value
              }));
              if (formErrors.fullName) {
                setFormErrors((prev) => ({ ...prev, fullName: undefined }));
              }
            }}
            error={formErrors.fullName}
            disabled={savingUser}
          />

          {!editingUser ? (
            <>
              <Input
                label="Email address"
                type="email"
                placeholder="name@ue-cloudlearn.edu.ph"
                value={formState.email}
                onChange={(event) => {
                  setFormState((prev) => ({
                    ...prev,
                    email: event.target.value
                  }));
                  if (formErrors.email) {
                    setFormErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                error={formErrors.email}
                disabled={savingUser}
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a temporary password"
                helperText="At least 8 characters."
                value={formState.password}
                onChange={(event) => {
                  setFormState((prev) => ({
                    ...prev,
                    password: event.target.value
                  }));
                  if (formErrors.password) {
                    setFormErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                error={formErrors.password}
                disabled={savingUser}
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
            </>
          ) : (
            <Input
              label="Email address"
              value={formState.email}
              disabled
              helperText="Email addresses cannot be changed."
            />
          )}

          <Select
            label="Role"
            value={formState.role}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                role: event.target.value as UserRole
              }))
            }
            disabled={savingUser || isEditingSelf}
            helperText={
              isEditingSelf ? 'You cannot change your own role.' : undefined
            }
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Administrator</option>
          </Select>

          <Select
            label="Account status"
            value={formState.status}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                status: event.target.value as UserStatus
              }))
            }
            disabled={savingUser || isEditingSelf}
            helperText={
              isEditingSelf
                ? 'You cannot deactivate your own account.'
                : undefined
            }
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </form>
      </ModalSheet>

      {/* Delete User ConfirmSheet */}
      <ConfirmSheet
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Delete user account?"
        description={
          deleteTarget
            ? `This permanently deletes ${deleteTarget.fullName} (${deleteTarget.email}) and cannot be undone.`
            : ''
        }
        confirmLabel="Delete user"
        isLoading={deleting}
        error={deleteError}
      />
    </AppShell>
  );
}
