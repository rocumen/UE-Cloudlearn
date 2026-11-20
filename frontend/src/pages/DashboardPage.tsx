/**
 * Screen B: Role Overview Dashboard (/)
 * Purpose: Provide immediate orientation with 3 key KPIs and focused action lists per role.
 * Single primary action: Role-scoped courses navigation ("Browse courses" / "Open my courses" / "Manage courses").
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  User as UserIcon,
  Users
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Skeleton,
  type BadgeVariant
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatShortDate, getDisplayFirstName } from '../lib/formatters';
import type {
  AdminDashboardSummary,
  DashboardSummary,
  InstructorDashboardSummary,
  StudentDashboardSummary,
  SubmissionStatus,
  UserRole
} from '../types/api';

function getGreeting(fullName: string): string {
  const firstName = getDisplayFirstName(fullName);
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
}

function getDueBadge(dueDate: string): {
  label: string;
  variant: BadgeVariant;
} {
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) {
    return { label: 'Upcoming', variant: 'neutral' };
  }
  const diffHours = (parsed.getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours < 0) {
    return { label: 'Overdue', variant: 'error' };
  }
  if (diffHours <= 48) {
    return { label: 'Due soon', variant: 'warning' };
  }
  return { label: 'Upcoming', variant: 'neutral' };
}

function getSubmissionBadge(status: SubmissionStatus): {
  label: string;
  variant: BadgeVariant;
} {
  if (status === 'graded') {
    return { label: 'Graded', variant: 'success' };
  }
  if (status === 'returned') {
    return { label: 'Returned', variant: 'warning' };
  }
  return { label: 'Pending review', variant: 'warning' };
}

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  instructor: 'Instructor',
  admin: 'Administrator'
};

const PRIMARY_ACTION_LABELS: Record<UserRole, string> = {
  student: 'Browse courses',
  instructor: 'Open my courses',
  admin: 'Manage courses'
};

interface KpiCardProps {
  label: string;
  value: string | number;
  progressPercent?: number | null;
}

function KpiCard({ label, value, progressPercent }: KpiCardProps) {
  const clampedProgress =
    typeof progressPercent === 'number' && Number.isFinite(progressPercent)
      ? Math.max(0, Math.min(100, progressPercent))
      : null;

  return (
    <Card padding="md">
      <p className="text-[0.875rem] font-medium text-secondary">{label}</p>
      <p className="mt-2 text-[2rem] font-bold tracking-[-0.02em] text-primary leading-tight tabular-nums">
        {value}
      </p>
      {clampedProgress !== null ? (
        <div
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-subtle"
          aria-label={`Average grade ${clampedProgress}%`}
        >
          <div
            className="h-full rounded-full bg-accent-fill apple-transition"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      ) : null}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-3 h-9 w-16" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-9 w-16" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-9 w-20" />
        </Card>
      </div>

      <Card padding="none">
        <div className="border-b border-hairline px-5 py-4 sm:px-6">
          <Skeleton className="h-5 w-44" />
        </div>
        <div className="divide-y divide-hairline">
          <div className="p-4 sm:px-6">
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="p-4 sm:px-6">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-hairline px-5 py-4 sm:px-6">
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="divide-y divide-hairline">
          <div className="p-4 sm:px-6">
            <Skeleton className="h-12 w-full" />
          </div>
          <div className="p-4 sm:px-6">
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function StudentOverview({ data }: { data: StudentDashboardSummary }) {
  const averageLabel =
    data.kpis.averagePercent !== null ? `${data.kpis.averagePercent}%` : '—';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Enrolled courses" value={data.kpis.enrolledCourses} />
        <KpiCard
          label="Pending assignments"
          value={data.kpis.pendingAssignments}
        />
        <KpiCard
          label="Average grade"
          value={averageLabel}
          progressPercent={data.kpis.averagePercent}
        />
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <h2 className="text-[1.0625rem] font-semibold text-primary">
            Upcoming assignments
          </h2>
        </div>

        {data.upcomingAssignments.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="You're all caught up"
            description="No pending assignments right now."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {data.upcomingAssignments.map((item) => {
              const dueBadge = getDueBadge(item.dueDate);
              return (
                <Link
                  key={item.assignmentId}
                  to={`/courses/${item.courseId}`}
                  className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-subtle apple-transition apple-focus-ring"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                      <ClipboardList
                        className="h-5 w-5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-semibold text-primary">
                        {item.title}
                      </p>
                      <p className="truncate text-[0.8125rem] text-secondary">
                        {item.courseCode} · Due {formatShortDate(item.dueDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={dueBadge.variant}>{dueBadge.label}</Badge>
                    <ChevronRight
                      className="h-4 w-4 text-secondary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <h2 className="text-[1.0625rem] font-semibold text-primary">
            Recent grades
          </h2>
          <Link
            to="/records"
            className="inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-[0.875rem] font-medium text-accent hover:bg-accent-soft apple-transition apple-focus-ring"
          >
            View all
          </Link>
        </div>

        {data.recentGrades.length === 0 ? (
          <EmptyState
            icon={Award}
            title="No graded work yet"
            description="Scores and feedback will appear here after your instructor grades a submission."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {data.recentGrades.map((grade) => {
              const badge = getSubmissionBadge(grade.status);
              return (
                <Link
                  key={grade.submissionId}
                  to="/records"
                  className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-subtle apple-transition apple-focus-ring"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                      <Award
                        className="h-5 w-5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-semibold text-primary">
                        {grade.assignmentTitle}
                      </p>
                      <p className="truncate text-[0.8125rem] text-secondary">
                        {grade.courseCode} · {grade.score} / {grade.maxScore}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <ChevronRight
                      className="h-4 w-4 text-secondary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function InstructorOverview({ data }: { data: InstructorDashboardSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Assigned courses" value={data.kpis.assignedCourses} />
        <KpiCard label="Pending review" value={data.kpis.pendingToGrade} />
        <KpiCard label="Active students" value={data.kpis.totalStudents} />
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <h2 className="text-[1.0625rem] font-semibold text-primary">
            Recent submissions
          </h2>
          <Link
            to="/submissions"
            className="inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-[0.875rem] font-medium text-accent hover:bg-accent-soft apple-transition apple-focus-ring"
          >
            Review queue
          </Link>
        </div>

        {data.recentSubmissions.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No submissions yet"
            description="Student uploads across your courses will appear here."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {data.recentSubmissions.map((sub) => {
              const badge = getSubmissionBadge(sub.status);
              return (
                <Link
                  key={sub.submissionId}
                  to="/submissions"
                  className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-subtle apple-transition apple-focus-ring"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                      <FileCheck2
                        className="h-5 w-5"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-semibold text-primary">
                        {sub.studentName}
                      </p>
                      <p className="truncate text-[0.8125rem] text-secondary">
                        {sub.assignmentTitle} · {sub.courseCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <ChevronRight
                      className="h-4 w-4 text-secondary"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <h2 className="text-[1.0625rem] font-semibold text-primary">
            My courses
          </h2>
        </div>

        {data.courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No assigned courses yet"
            description="Courses assigned to you by an administrator will appear here."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {data.courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-subtle apple-transition apple-focus-ring"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                    <BookOpen
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-semibold text-primary">
                      {course.title}
                    </p>
                    <p className="truncate text-[0.8125rem] text-secondary">
                      {course.courseCode} · {course.term}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[0.875rem] font-medium text-secondary">
                    {course.activeStudentCount}{' '}
                    {course.activeStudentCount === 1 ? 'student' : 'students'}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 text-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminOverview({ data }: { data: AdminDashboardSummary }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total users" value={data.kpis.totalUsers} />
        <KpiCard label="Total courses" value={data.kpis.totalCourses} />
        <KpiCard label="Active enrollments" value={data.kpis.totalEnrollments} />
      </div>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <h2 className="text-[1.0625rem] font-semibold text-primary">
            Recent courses
          </h2>
          <Link
            to="/courses"
            className="inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-[0.875rem] font-medium text-accent hover:bg-accent-soft apple-transition apple-focus-ring"
          >
            All courses
          </Link>
        </div>

        {data.recentCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Courses created for the semester will appear here."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {data.recentCourses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}`}
                className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-subtle apple-transition apple-focus-ring"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                    <BookOpen
                      className="h-5 w-5"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] font-semibold text-primary">
                      {course.title}
                    </p>
                    <p className="truncate text-[0.8125rem] text-secondary">
                      {course.courseCode} · {course.instructorName}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-[0.8125rem] text-secondary sm:inline">
                    {course.term}
                  </span>
                  <ChevronRight
                    className="h-4 w-4 text-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card padding="none">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4 sm:px-6">
          <h2 className="text-[1.0625rem] font-semibold text-primary">
            Recent users
          </h2>
          <Link
            to="/users"
            className="inline-flex min-h-[44px] items-center rounded-[10px] px-2.5 text-[0.875rem] font-medium text-accent hover:bg-accent-soft apple-transition apple-focus-ring"
          >
            Manage users
          </Link>
        </div>

        {data.recentUsers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Registered and provisioned accounts will appear here."
          />
        ) : (
          <div className="divide-y divide-hairline">
            {data.recentUsers.map((account) => (
              <Link
                key={account.id}
                to="/users"
                className="flex min-h-[60px] items-center justify-between gap-3 px-4 py-3 sm:px-6 hover:bg-subtle apple-transition apple-focus-ring"
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
                    <p className="truncate text-[0.9375rem] font-semibold text-primary">
                      {account.fullName}
                    </p>
                    <p className="truncate text-[0.8125rem] text-secondary">
                      {account.email}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={account.role === 'admin' ? 'crimson' : 'neutral'}
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
                  <ChevronRight
                    className="h-4 w-4 text-secondary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<DashboardSummary>(
        '/api/dashboard/summary',
        signal
      );
      setSummary(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      setError(
        "We couldn't load your overview. Check your connection and try again."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [loadSummary]);

  const role: UserRole = user?.role ?? 'student';

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-[1.15] text-primary">
              {getGreeting(user?.fullName ?? '')}
            </h1>
            <p className="mt-1 text-[0.9375rem] text-secondary">
              First Semester 2026-2027
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/courses')}
            className="self-start sm:self-auto shrink-0"
          >
            {PRIMARY_ACTION_LABELS[role]}
          </Button>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => void loadSummary()} />
        ) : summary?.role === 'student' ? (
          <StudentOverview data={summary} />
        ) : summary?.role === 'instructor' ? (
          <InstructorOverview data={summary} />
        ) : summary?.role === 'admin' ? (
          <AdminOverview data={summary} />
        ) : null}
      </div>
    </AppShell>
  );
}
