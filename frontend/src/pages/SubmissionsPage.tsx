/**
 * Screen E: Instructor & Admin Submissions & Grading (/submissions & /courses/:id/assignments/:assignmentId)
 * Purpose: Review student assignment submissions, download files from S3, and save grades/feedback.
 * Single primary action: "Review & grade" -> "Save grade" inside the grading sheet.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileCheck2,
  FileText,
  User as UserIcon
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  ModalSheet,
  SegmentedControl,
  Select,
  Skeleton,
  Textarea,
  useToast,
  type BadgeVariant
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../lib/api';
import {
  formatDateTime,
  formatFileSize,
  openPresignedDownload
} from '../lib/formatters';
import type {
  Assignment,
  Course,
  Submission,
  SubmissionStatus
} from '../types/api';

type StatusFilter = 'all' | SubmissionStatus;

function getStatusBadge(status: SubmissionStatus): {
  label: string;
  variant: BadgeVariant;
} {
  if (status === 'graded') return { label: 'Graded', variant: 'success' };
  if (status === 'returned') return { label: 'Returned', variant: 'warning' };
  return { label: 'Pending review', variant: 'warning' };
}

export function SubmissionsPage() {
  const { id, assignmentId } = useParams<{
    id?: string;
    assignmentId?: string;
  }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const parsedCourseId = id ? Number(id) : null;
  const parsedAssignmentId = assignmentId ? Number(assignmentId) : null;
  const isAssignmentMode = Boolean(
    parsedCourseId &&
      parsedAssignmentId &&
      Number.isInteger(parsedCourseId) &&
      Number.isInteger(parsedAssignmentId)
  );

  const role = user?.role ?? 'instructor';

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignmentContext, setAssignmentContext] = useState<Assignment | null>(
    null
  );

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Grading modal state
  const [gradingTarget, setGradingTarget] = useState<Submission | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [gradeStatus, setGradeStatus] = useState<'graded' | 'returned'>('graded');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [gradeBannerError, setGradeBannerError] = useState<string | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        if (isAssignmentMode && parsedCourseId && parsedAssignmentId) {
          const [asgData, subData] = await Promise.all([
            api.get<{ assignments: Assignment[] }>(
              `/api/courses/${parsedCourseId}/assignments`,
              signal
            ),
            api.get<{ submissions: Submission[] }>(
              `/api/assignments/${parsedAssignmentId}/submissions`,
              signal
            )
          ]);
          const matchedAssignment =
            asgData.assignments.find((a) => a.id === parsedAssignmentId) ?? null;
          setAssignmentContext(matchedAssignment);
          setSubmissions(subData.submissions);
        } else {
          const scope = role === 'instructor' ? 'assigned' : 'all';
          const params = new URLSearchParams();
          if (statusFilter !== 'all') params.set('status', statusFilter);
          if (courseFilter) params.set('courseId', courseFilter);
          const query = params.toString();

          const [coursesData, subData] = await Promise.all([
            api.get<{ courses: Course[] }>(
              `/api/courses?scope=${scope}`,
              signal
            ),
            api.get<{ submissions: Submission[] }>(
              `/api/submissions${query ? `?${query}` : ''}`,
              signal
            )
          ]);
          setCourses(coursesData.courses);
          setSubmissions(subData.submissions);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          err instanceof ApiError
            ? err.message
            : "We couldn't load submissions. Check your connection and try again."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [
      isAssignmentMode,
      parsedCourseId,
      parsedAssignmentId,
      role,
      statusFilter,
      courseFilter
    ]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const visibleSubmissions = useMemo(() => {
    if (!isAssignmentMode || statusFilter === 'all') {
      return submissions;
    }
    return submissions.filter((s) => s.status === statusFilter);
  }, [isAssignmentMode, statusFilter, submissions]);

  const getMaxScoreFor = (sub: Submission | null): number => {
    if (!sub) return 100;
    return sub.maxScore ?? assignmentContext?.maxScore ?? 100;
  };

  const openGradeSheet = (submission: Submission) => {
    setGradingTarget(submission);
    setScoreInput(
      submission.score !== null && submission.score !== undefined
        ? String(submission.score)
        : ''
    );
    setGradeStatus(submission.status === 'returned' ? 'returned' : 'graded');
    setFeedbackInput(submission.feedback ?? '');
    setScoreError(null);
    setGradeBannerError(null);
  };

  const handleDownload = async (submissionId: number) => {
    setDownloadingId(submissionId);
    try {
      await openPresignedDownload(`/api/submissions/${submissionId}/download`);
    } catch (err) {
      showToast({
        title:
          err instanceof ApiError
            ? err.message
            : 'Unable to open submission file.',
        variant: 'error'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSaveGrade = async (event: FormEvent) => {
    event.preventDefault();
    if (!gradingTarget) return;

    setScoreError(null);
    setGradeBannerError(null);

    const maxScore = getMaxScoreFor(gradingTarget);
    const trimmed = scoreInput.trim();
    const numericScore = Number(trimmed);
    if (!trimmed || Number.isNaN(numericScore)) {
      setScoreError('Please enter a numeric score.');
      return;
    }
    if (numericScore < 0 || numericScore > maxScore) {
      setScoreError(`Score must be between 0 and ${maxScore}.`);
      return;
    }

    setSavingGrade(true);
    try {
      await api.patch(`/api/submissions/${gradingTarget.id}/grade`, {
        score: numericScore,
        status: gradeStatus,
        feedback: feedbackInput.trim() ? feedbackInput.trim() : null
      });
      showToast({ title: 'Grade saved.', variant: 'success' });
      setGradingTarget(null);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.details.length > 0) {
          const scoreDetail = err.details.find((d) => d.field === 'score');
          if (scoreDetail) {
            setScoreError(scoreDetail.message);
          }
        }
        setGradeBannerError(err.message);
      } else {
        setGradeBannerError('Unable to save grade. Please try again.');
      }
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {isAssignmentMode && parsedCourseId ? (
          <div>
            <Link
              to={`/courses/${parsedCourseId}`}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-2 -ml-2 text-[0.9375rem] font-medium text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
            >
              <ArrowLeft
                className="h-4 w-4"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span>Back to course</span>
            </Link>
          </div>
        ) : null}

        <div>
          <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-[1.15] text-primary">
            {isAssignmentMode && assignmentContext
              ? assignmentContext.title
              : 'Submissions'}
          </h1>
          <p className="mt-1 text-[0.9375rem] text-secondary">
            {isAssignmentMode
              ? `Review student uploads and enter scores out of ${assignmentContext?.maxScore ?? 100}.`
              : 'Review student assignment uploads, download files, and record grades.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedControl
            label="Filter by status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'submitted', label: 'Pending review' },
              { value: 'graded', label: 'Graded' },
              { value: 'returned', label: 'Returned' }
            ]}
          />

          {!isAssignmentMode && courses.length > 0 ? (
            <div className="w-full lg:w-[280px]">
              <Select
                label="Filter by course"
                value={courseFilter}
                onChange={(event) => setCourseFilter(event.target.value)}
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={String(course.id)}>
                    {course.courseCode} · {course.title}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {/* Submission Rows */}
        {loading ? (
          <Card padding="none">
            <div className="divide-y divide-hairline">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="p-4 sm:px-6">
                  <Skeleton className="h-14 w-full" />
                </div>
              ))}
            </div>
          </Card>
        ) : error ? (
          <ErrorBanner message={error} onRetry={() => void loadData()} />
        ) : visibleSubmissions.length === 0 ? (
          <Card>
            <EmptyState
              icon={FileCheck2}
              title="No submissions found"
              description={
                statusFilter !== 'all' || courseFilter
                  ? 'Try adjusting your status or course filter.'
                  : 'Student uploads will appear here once submitted.'
              }
              action={
                statusFilter !== 'all' || courseFilter ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStatusFilter('all');
                      setCourseFilter('');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-hairline">
              {visibleSubmissions.map((sub) => {
                const badge = getStatusBadge(sub.status);
                const maxScore = getMaxScoreFor(sub);

                return (
                  <div
                    key={sub.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                        <UserIcon
                          className="h-5 w-5"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[0.9375rem] font-semibold text-primary">
                            {sub.studentName || `Student #${sub.studentId}`}
                          </p>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {sub.score !== null ? (
                            <span className="text-[0.875rem] font-semibold text-primary tabular-nums">
                              {sub.score} / {maxScore}
                            </span>
                          ) : null}
                        </div>

                        {!isAssignmentMode &&
                        sub.courseCode &&
                        sub.assignmentTitle ? (
                          <p className="truncate text-[0.875rem] font-medium text-secondary">
                            {sub.courseCode} · {sub.assignmentTitle}
                          </p>
                        ) : null}

                        <p className="truncate text-[0.8125rem] text-secondary">
                          {sub.fileName} ({formatFileSize(sub.fileSize)}) ·{' '}
                          {formatDateTime(sub.submittedAt)}
                        </p>

                        {sub.studentNote ? (
                          <p className="text-[0.8125rem] text-secondary">
                            Note: {sub.studentNote}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        isLoading={downloadingId === sub.id}
                        loadingText="Opening..."
                        onClick={() => void handleDownload(sub.id)}
                      >
                        <Download
                          className="h-4 w-4"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span>Download</span>
                      </Button>

                      <Button
                        variant="primary"
                        onClick={() => openGradeSheet(sub)}
                      >
                        {sub.status === 'graded' ? 'Update grade' : 'Review'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Grade Submission ModalSheet */}
      <ModalSheet
        open={Boolean(gradingTarget)}
        onClose={() => (savingGrade ? undefined : setGradingTarget(null))}
        title="Review submission"
        subtitle={
          gradingTarget
            ? `${gradingTarget.studentName || 'Student'} · ${gradingTarget.assignmentTitle || assignmentContext?.title || 'Assignment'}`
            : undefined
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setGradingTarget(null)}
              disabled={savingGrade}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="grade-submission-form"
              variant="primary"
              isLoading={savingGrade}
              loadingText="Saving..."
              className="w-full sm:w-auto"
            >
              Save grade
            </Button>
          </>
        }
      >
        {gradingTarget ? (
          <form
            id="grade-submission-form"
            onSubmit={handleSaveGrade}
            noValidate
            className="space-y-4"
          >
            {gradeBannerError ? (
              <ErrorBanner message={gradeBannerError} />
            ) : null}

            <div className="flex items-center justify-between gap-3 rounded-[12px] bg-subtle px-3.5 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <FileText
                  className="h-5 w-5 shrink-0 text-secondary"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-[0.875rem] font-medium text-primary">
                    {gradingTarget.fileName}
                  </p>
                  <p className="text-[0.8125rem] text-secondary">
                    {formatFileSize(gradingTarget.fileSize)}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                isLoading={downloadingId === gradingTarget.id}
                loadingText="Opening..."
                onClick={() => void handleDownload(gradingTarget.id)}
              >
                <Download
                  className="h-4 w-4"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                <span>Open</span>
              </Button>
            </div>

            {gradingTarget.studentNote ? (
              <div className="rounded-[12px] border border-hairline bg-surface px-3.5 py-2.5 text-[0.875rem] text-secondary">
                <span className="font-medium text-primary">Student note:</span>{' '}
                {gradingTarget.studentNote}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={`Score (0 to ${getMaxScoreFor(gradingTarget)})`}
                type="number"
                min={0}
                max={getMaxScoreFor(gradingTarget)}
                step="0.01"
                placeholder="90"
                value={scoreInput}
                onChange={(event) => {
                  setScoreInput(event.target.value);
                  if (scoreError) setScoreError(null);
                }}
                error={scoreError ?? undefined}
                disabled={savingGrade}
              />

              <Select
                label="Review status"
                value={gradeStatus}
                onChange={(event) =>
                  setGradeStatus(event.target.value as 'graded' | 'returned')
                }
                disabled={savingGrade}
              >
                <option value="graded">Graded</option>
                <option value="returned">Returned for revision</option>
              </Select>
            </div>

            <Textarea
              label="Feedback (optional)"
              placeholder="Share constructive comments with the student"
              value={feedbackInput}
              onChange={(event) => setFeedbackInput(event.target.value)}
              disabled={savingGrade}
            />
          </form>
        ) : null}
      </ModalSheet>
    </AppShell>
  );
}
