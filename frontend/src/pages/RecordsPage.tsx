/**
 * Screen F: Student Learning Records (/records)
 * Purpose: Present consolidated academic progress, assignment scores, and instructor feedback across enrolled courses.
 * Single primary action: Open an enrolled course or browse courses when empty.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, BookOpen, ChevronRight } from 'lucide-react';
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
import { api } from '../lib/api';
import { formatShortDate } from '../lib/formatters';
import type {
  EnrollmentStatus,
  StudentLearningRecords,
  SubmissionStatus
} from '../types/api';

function getItemStatusBadge(
  status: SubmissionStatus | 'not_submitted'
): { label: string; variant: BadgeVariant } {
  if (status === 'graded') return { label: 'Graded', variant: 'success' };
  if (status === 'returned') return { label: 'Returned', variant: 'warning' };
  if (status === 'submitted') return { label: 'Submitted', variant: 'warning' };
  return { label: 'Not submitted', variant: 'neutral' };
}

function getEnrollmentLabel(status: EnrollmentStatus): {
  label: string;
  variant: BadgeVariant;
} {
  if (status === 'completed') return { label: 'Completed', variant: 'crimson' };
  if (status === 'dropped') return { label: 'Dropped', variant: 'neutral' };
  return { label: 'Active', variant: 'success' };
}

export function RecordsPage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<StudentLearningRecords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecords = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<StudentLearningRecords>(
        '/api/records/me',
        signal
      );
      setRecords(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(
        "We couldn't load your learning records. Check your connection and try again."
      );
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadRecords(controller.signal);
    return () => controller.abort();
  }, [loadRecords]);

  const overallAverage = records?.summary.averagePercent ?? null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-[1.15] text-primary">
              Learning records
            </h1>
            <p className="mt-1 text-[0.9375rem] text-secondary">
              Your coursework scores, submission statuses, and instructor feedback.
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/courses')}
            className="self-start sm:self-auto shrink-0"
          >
            Browse courses
          </Button>
        </div>

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((idx) => (
                <Card key={idx}>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-3 h-9 w-20" />
                </Card>
              ))}
            </div>
            <Card>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-4 h-14 w-full" />
              <Skeleton className="mt-3 h-14 w-full" />
            </Card>
          </div>
        ) : error || !records ? (
          <ErrorBanner
            message={error || "We couldn't load your learning records."}
            onRetry={() => void loadRecords()}
          />
        ) : (
          <>
            {/* Top Summary Strip (3 KPI Cards) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card padding="md">
                <p className="text-[0.875rem] font-medium text-secondary">
                  Courses enrolled
                </p>
                <p className="mt-2 text-[2rem] font-bold tracking-[-0.02em] text-primary leading-tight tabular-nums">
                  {records.summary.enrolledCoursesCount}
                </p>
              </Card>

              <Card padding="md">
                <p className="text-[0.875rem] font-medium text-secondary">
                  Graded assignments
                </p>
                <p className="mt-2 text-[2rem] font-bold tracking-[-0.02em] text-primary leading-tight tabular-nums">
                  {records.summary.gradedCount}{' '}
                  <span className="text-[1.125rem] font-medium text-secondary">
                    / {records.summary.totalAssignments}
                  </span>
                </p>
              </Card>

              <Card padding="md">
                <p className="text-[0.875rem] font-medium text-secondary">
                  Overall average
                </p>
                <p className="mt-2 text-[2rem] font-bold tracking-[-0.02em] text-primary leading-tight tabular-nums">
                  {overallAverage !== null ? `${overallAverage}%` : '—'}
                </p>
                {overallAverage !== null ? (
                  <div
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-subtle"
                    aria-label={`Overall average ${overallAverage}%`}
                  >
                    <div
                      className="h-full rounded-full bg-accent-fill apple-transition"
                      style={{
                        width: `${Math.max(0, Math.min(100, overallAverage))}%`
                      }}
                    />
                  </div>
                ) : null}
              </Card>
            </div>

            {records.courses.length === 0 ? (
              <Card>
                <EmptyState
                  icon={Award}
                  title="No learning records yet"
                  description="Enroll in a course to start tracking assignments and grades."
                  action={
                    <Button
                      variant="primary"
                      onClick={() => navigate('/courses')}
                    >
                      Browse courses
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {records.courses.map((course) => {
                  const enrollBadge = getEnrollmentLabel(
                    course.enrollmentStatus
                  );

                  return (
                    <Card key={course.courseId} padding="none">
                      <div className="flex flex-col gap-3 border-b border-hairline px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="crimson">{course.courseCode}</Badge>
                            <Badge variant={enrollBadge.variant}>
                              {enrollBadge.label}
                            </Badge>
                          </div>
                          <h2 className="text-[1.0625rem] font-semibold text-primary">
                            {course.courseTitle}
                          </h2>
                          <p className="text-[0.8125rem] text-secondary">
                            Instructor: {course.instructorName}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-4">
                          {course.courseAveragePercent !== null ? (
                            <div className="text-left sm:text-right">
                              <p className="text-[0.8125rem] text-secondary">
                                Course average
                              </p>
                              <p className="text-[1.125rem] font-bold text-primary tabular-nums">
                                {course.courseAveragePercent}%
                              </p>
                              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-subtle">
                                <div
                                  className="h-full rounded-full bg-accent-fill"
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(100, course.courseAveragePercent)
                                    )}%`
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[0.8125rem] text-secondary">
                              No grades yet
                            </span>
                          )}

                          <Link
                            to={`/courses/${course.courseId}`}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-[10px] px-3 text-[0.875rem] font-medium text-accent hover:bg-accent-soft apple-transition apple-focus-ring"
                          >
                            <span>Open</span>
                            <ChevronRight
                              className="h-4 w-4"
                              strokeWidth={1.75}
                              aria-hidden="true"
                            />
                          </Link>
                        </div>
                      </div>

                      {course.items.length === 0 ? (
                        <EmptyState
                          icon={BookOpen}
                          title="No assignments posted yet"
                          description="Assignments for this course will appear here once created."
                        />
                      ) : (
                        <div className="divide-y divide-hairline">
                          {course.items.map((item) => {
                            const statusBadge = getItemStatusBadge(item.status);
                            return (
                              <div
                                key={item.assignmentId}
                                className="flex flex-col gap-2 px-5 py-3.5 sm:px-6"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-[0.9375rem] font-semibold text-primary">
                                      {item.title}
                                    </p>
                                    <p className="text-[0.8125rem] text-secondary">
                                      Due {formatShortDate(item.dueDate)}
                                      {item.submittedAt
                                        ? ` · Submitted ${formatShortDate(item.submittedAt)}`
                                        : ''}
                                    </p>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-3">
                                    <Badge variant={statusBadge.variant}>
                                      {statusBadge.label}
                                    </Badge>
                                    <span className="min-w-[76px] text-right text-[0.9375rem] font-semibold text-primary tabular-nums">
                                      {item.score !== null
                                        ? `${item.score} / ${item.maxScore}`
                                        : `— / ${item.maxScore}`}
                                    </span>
                                  </div>
                                </div>

                                {item.feedback ? (
                                  <p className="rounded-[10px] bg-subtle px-3.5 py-2 text-[0.875rem] text-primary">
                                    <span className="font-medium">
                                      Feedback:
                                    </span>{' '}
                                    {item.feedback}
                                  </p>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
