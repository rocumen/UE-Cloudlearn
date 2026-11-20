/**
 * Screen C: Courses Directory (/courses)
 * Purpose: Browse, search, enroll in, and manage UE Cloudlearn courses.
 * Single primary action: Admin = "Create course"; Student/Instructor = course navigation/enrollment.
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  User as UserIcon,
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
  Textarea,
  useToast
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../lib/api';
import type { Course, User } from '../types/api';

type CourseScope = 'all' | 'enrolled' | 'assigned';

interface CourseFormState {
  courseCode: string;
  title: string;
  term: string;
  instructorId: string;
  description: string;
}

interface CourseFormErrors {
  courseCode?: string;
  title?: string;
  term?: string;
  instructorId?: string;
  description?: string;
}

const DEFAULT_TERM = 'First Semester 2026-2027';

export function CoursesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const role = user?.role ?? 'student';
  const [scope, setScope] = useState<CourseScope>(
    role === 'instructor' ? 'assigned' : 'all'
  );
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [instructors, setInstructors] = useState<User[]>([]);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<Course | null>(null);
  const [dropping, setDropping] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formState, setFormState] = useState<CourseFormState>({
    courseCode: '',
    title: '',
    term: DEFAULT_TERM,
    instructorId: '',
    description: ''
  });
  const [formErrors, setFormErrors] = useState<CourseFormErrors>({});
  const [formBannerError, setFormBannerError] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadCourses = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (role !== 'admin') {
          params.set('scope', scope);
        } else {
          params.set('scope', 'all');
        }
        const query = params.toString();
        const data = await api.get<{ courses: Course[] }>(
          `/api/courses${query ? `?${query}` : ''}`,
          signal
        );
        setCourses(data.courses);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(
          "We couldn't load the course directory. Check your connection and try again."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [debouncedSearch, role, scope]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadCourses(controller.signal);
    return () => controller.abort();
  }, [loadCourses]);

  const loadInstructors = useCallback(async () => {
    if (role !== 'admin') return;
    setLoadingInstructors(true);
    try {
      const data = await api.get<{ users: User[] }>(
        '/api/users?role=instructor'
      );
      const activeInstructors = data.users.filter(
        (item) => item.status === 'active'
      );
      setInstructors(activeInstructors);
      return activeInstructors;
    } catch {
      return [];
    } finally {
      setLoadingInstructors(false);
    }
  }, [role]);

  const openCreateSheet = async () => {
    setEditingCourse(null);
    setFormErrors({});
    setFormBannerError(null);
    const list =
      instructors.length > 0 ? instructors : (await loadInstructors()) ?? [];
    setFormState({
      courseCode: '',
      title: '',
      term: DEFAULT_TERM,
      instructorId: list[0] ? String(list[0].id) : '',
      description: ''
    });
    setFormOpen(true);
  };

  const openEditSheet = async (course: Course) => {
    setEditingCourse(course);
    setFormErrors({});
    setFormBannerError(null);
    if (role === 'admin' && instructors.length === 0) {
      await loadInstructors();
    }
    setFormState({
      courseCode: course.courseCode,
      title: course.title,
      term: course.term,
      instructorId: String(course.instructorId),
      description: course.description ?? ''
    });
    setFormOpen(true);
  };

  const validateForm = (): boolean => {
    const nextErrors: CourseFormErrors = {};
    const isAdmin = role === 'admin';

    if (isAdmin) {
      const code = formState.courseCode.trim();
      if (code.length < 2 || code.length > 30) {
        nextErrors.courseCode =
          'Course code must be between 2 and 30 characters.';
      }
    }

    const title = formState.title.trim();
    if (title.length < 2 || title.length > 160) {
      nextErrors.title = 'Course title must be between 2 and 160 characters.';
    }

    const term = formState.term.trim();
    if (term.length < 2 || term.length > 60) {
      nextErrors.term = 'Term must be between 2 and 60 characters.';
    }

    if (isAdmin) {
      const parsedId = Number(formState.instructorId);
      if (!Number.isInteger(parsedId) || parsedId <= 0) {
        nextErrors.instructorId = 'Please select an active instructor.';
      }
    }

    if (formState.description.trim().length > 5000) {
      nextErrors.description =
        'Description must be 5,000 characters or fewer.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveCourse = async (event: FormEvent) => {
    event.preventDefault();
    setFormBannerError(null);
    if (!validateForm()) return;

    setSavingCourse(true);
    try {
      const description = formState.description.trim()
        ? formState.description.trim()
        : null;

      if (editingCourse) {
        const payload =
          role === 'admin'
            ? {
                courseCode: formState.courseCode.trim(),
                title: formState.title.trim(),
                term: formState.term.trim(),
                instructorId: Number(formState.instructorId),
                description
              }
            : {
                title: formState.title.trim(),
                term: formState.term.trim(),
                description
              };

        await api.patch<{ course: Course }>(
          `/api/courses/${editingCourse.id}`,
          payload
        );
        showToast({ title: 'Course updated.', variant: 'success' });
      } else {
        await api.post<{ course: Course }>('/api/courses', {
          courseCode: formState.courseCode.trim(),
          title: formState.title.trim(),
          term: formState.term.trim(),
          instructorId: Number(formState.instructorId),
          description
        });
        showToast({ title: 'Course created.', variant: 'success' });
      }

      setFormOpen(false);
      await loadCourses();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'COURSE_CODE_EXISTS') {
          setFormErrors((prev) => ({
            ...prev,
            courseCode: 'A course with that course code already exists.'
          }));
        }
        if (err.details.length > 0) {
          const mapped: CourseFormErrors = {};
          for (const d of err.details) {
            if (
              d.field === 'courseCode' ||
              d.field === 'title' ||
              d.field === 'term' ||
              d.field === 'instructorId' ||
              d.field === 'description'
            ) {
              mapped[d.field] = d.message;
            }
          }
          setFormErrors((prev) => ({ ...prev, ...mapped }));
        }
        setFormBannerError(err.message);
      } else {
        setFormBannerError('Unable to save course. Please try again.');
      }
    } finally {
      setSavingCourse(false);
    }
  };

  const handleEnroll = async (course: Course) => {
    setEnrollingId(course.id);
    try {
      await api.post(`/api/courses/${course.id}/enroll`);
      showToast({
        title: `Enrolled in ${course.courseCode}.`,
        variant: 'success'
      });
      await loadCourses();
    } catch (err) {
      showToast({
        title:
          err instanceof ApiError
            ? err.message
            : 'Unable to enroll right now.',
        variant: 'error'
      });
    } finally {
      setEnrollingId(null);
    }
  };

  const handleDropCourse = async () => {
    if (!dropTarget) return;
    setDropping(true);
    setDropError(null);
    try {
      await api.delete(`/api/courses/${dropTarget.id}/enroll`);
      showToast({
        title: `Dropped ${dropTarget.courseCode}.`,
        variant: 'info'
      });
      setDropTarget(null);
      await loadCourses();
    } catch (err) {
      setDropError(
        err instanceof ApiError
          ? err.message
          : 'Unable to drop this course. Please try again.'
      );
    } finally {
      setDropping(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/api/courses/${deleteTarget.id}`);
      showToast({
        title: `Deleted ${deleteTarget.courseCode}.`,
        variant: 'success'
      });
      setDeleteTarget(null);
      await loadCourses();
    } catch (err) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete this course. Please try again.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const subtitle =
    role === 'admin'
      ? 'Create courses, assign instructors, and manage semester offerings.'
      : role === 'instructor'
        ? 'Manage your assigned classes or explore the catalog.'
        : 'Explore semester courses and manage your enrollments.';

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[2rem] sm:text-[2.25rem] font-bold tracking-[-0.02em] leading-[1.15] text-primary">
              {role === 'instructor' && scope === 'assigned'
                ? 'My courses'
                : 'Courses'}
            </h1>
            <p className="mt-1 text-[0.9375rem] text-secondary">{subtitle}</p>
          </div>

          {role === 'admin' ? (
            <Button
              variant="primary"
              onClick={() => void openCreateSheet()}
              className="self-start sm:self-auto shrink-0"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              <span>Create course</span>
            </Button>
          ) : null}
        </div>

        {/* Search and Scope Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-[360px]">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search courses"
              placeholder="Search by code or title"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={[
                'w-full min-h-[48px] rounded-[12px] border border-hairline bg-surface pl-10 text-[0.9375rem] text-primary placeholder:text-secondary apple-transition apple-focus-ring',
                searchInput ? 'pr-12' : 'pr-3.5'
              ].join(' ')}
            />
            {searchInput ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchInput('')}
                className="absolute right-1 top-1/2 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-[10px] text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
              >
                <X className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {role === 'student' ? (
            <SegmentedControl
              label="Filter courses"
              value={scope === 'enrolled' ? 'enrolled' : 'all'}
              onChange={(next) => setScope(next)}
              options={[
                { value: 'all', label: 'All courses' },
                { value: 'enrolled', label: 'Enrolled' }
              ]}
            />
          ) : role === 'instructor' ? (
            <SegmentedControl
              label="Filter courses"
              value={scope === 'assigned' ? 'assigned' : 'all'}
              onChange={(next) => setScope(next)}
              options={[
                { value: 'assigned', label: 'Assigned to me' },
                { value: 'all', label: 'All courses' }
              ]}
            />
          ) : null}
        </div>

        {/* Courses Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((idx) => (
              <Card key={idx}>
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="mt-3 h-6 w-4/5" />
                <Skeleton className="mt-2 h-10 w-full" />
                <Skeleton className="mt-5 h-4 w-1/2" />
                <Skeleton className="mt-4 h-11 w-full" />
              </Card>
            ))}
          </div>
        ) : error ? (
          <ErrorBanner
            message={error}
            onRetry={() => void loadCourses()}
          />
        ) : courses.length === 0 ? (
          <Card>
            <EmptyState
              icon={BookOpen}
              title={
                debouncedSearch
                  ? 'No matching courses found'
                  : scope === 'enrolled'
                    ? 'No enrolled courses yet'
                    : scope === 'assigned'
                      ? 'No assigned courses yet'
                      : 'No courses available yet'
              }
              description={
                debouncedSearch
                  ? 'Try a different course code or keyword.'
                  : scope === 'enrolled'
                    ? 'Browse all courses to enroll in your classes for this term.'
                    : role === 'admin'
                      ? 'Create your first course to set up the semester.'
                      : 'Courses published for the semester will appear here.'
              }
              action={
                debouncedSearch ? (
                  <Button
                    variant="secondary"
                    onClick={() => setSearchInput('')}
                  >
                    Clear search
                  </Button>
                ) : scope === 'enrolled' ? (
                  <Button variant="primary" onClick={() => setScope('all')}>
                    Browse all courses
                  </Button>
                ) : role === 'admin' ? (
                  <Button
                    variant="primary"
                    onClick={() => void openCreateSheet()}
                  >
                    Create course
                  </Button>
                ) : undefined
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const canEdit =
                role === 'admin' ||
                (role === 'instructor' && course.instructorId === user?.id);

              return (
                <Card
                  key={course.id}
                  padding="md"
                  className="flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="crimson">{course.courseCode}</Badge>
                      {role === 'student' && course.isEnrolled ? (
                        <Badge variant="success">Enrolled</Badge>
                      ) : (
                        <Badge variant="neutral">{course.term}</Badge>
                      )}
                    </div>

                    <h2 className="mt-3 text-[1.0625rem] font-semibold leading-snug text-primary">
                      {course.title}
                    </h2>

                    <p className="mt-1.5 line-clamp-2 text-[0.875rem] text-secondary">
                      {course.description ||
                        'Course materials and assignments are available inside.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1 text-[0.8125rem] text-secondary">
                      <p className="flex items-center gap-2 truncate">
                        <UserIcon
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span className="truncate">
                          {course.instructorName || 'Assigned instructor'}
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Users
                          className="h-4 w-4 shrink-0"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        <span>
                          {course.activeStudentCount}{' '}
                          {course.activeStudentCount === 1
                            ? 'student'
                            : 'students'}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 border-t border-hairline pt-3">
                      {role === 'student' ? (
                        course.isEnrolled ? (
                          <>
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              Open course
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setDropError(null);
                                setDropTarget(course);
                              }}
                            >
                              Drop
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="primary"
                              className="flex-1"
                              isLoading={enrollingId === course.id}
                              loadingText="Enrolling..."
                              onClick={() => void handleEnroll(course)}
                            >
                              Enroll
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              View
                            </Button>
                          </>
                        )
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            className="flex-1"
                            onClick={() => navigate(`/courses/${course.id}`)}
                          >
                            Open course
                          </Button>
                          {canEdit ? (
                            <Button
                              variant="outline"
                              size="icon"
                              aria-label={`Edit ${course.title}`}
                              onClick={() => void openEditSheet(course)}
                            >
                              <Pencil
                                className="h-4 w-4"
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                            </Button>
                          ) : null}
                          {role === 'admin' ? (
                            <Button
                              variant="danger"
                              size="icon"
                              aria-label={`Delete ${course.title}`}
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(course);
                              }}
                            >
                              <Trash2
                                className="h-4 w-4"
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Course ModalSheet */}
      <ModalSheet
        open={formOpen}
        onClose={() => (savingCourse ? undefined : setFormOpen(false))}
        title={editingCourse ? 'Edit course' : 'Create course'}
        subtitle={
          editingCourse
            ? 'Update course details for this semester.'
            : 'Set up a new course and assign an instructor.'
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={savingCourse}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="course-form"
              variant="primary"
              isLoading={savingCourse}
              loadingText={editingCourse ? 'Saving...' : 'Creating...'}
              className="w-full sm:w-auto"
            >
              {editingCourse ? 'Save changes' : 'Create course'}
            </Button>
          </>
        }
      >
        <form
          id="course-form"
          onSubmit={handleSaveCourse}
          noValidate
          className="space-y-4"
        >
          {formBannerError ? <ErrorBanner message={formBannerError} /> : null}

          {role === 'admin' ? (
            <Input
              label="Course code"
              placeholder="CCS4301"
              value={formState.courseCode}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  courseCode: event.target.value
                }));
                if (formErrors.courseCode) {
                  setFormErrors((prev) => ({ ...prev, courseCode: undefined }));
                }
              }}
              error={formErrors.courseCode}
              disabled={savingCourse}
            />
          ) : null}

          <Input
            label="Course title"
            placeholder="Cloud Computing"
            value={formState.title}
            onChange={(event) => {
              setFormState((prev) => ({ ...prev, title: event.target.value }));
              if (formErrors.title) {
                setFormErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
            error={formErrors.title}
            disabled={savingCourse}
          />

          <Input
            label="Academic term"
            placeholder={DEFAULT_TERM}
            value={formState.term}
            onChange={(event) => {
              setFormState((prev) => ({ ...prev, term: event.target.value }));
              if (formErrors.term) {
                setFormErrors((prev) => ({ ...prev, term: undefined }));
              }
            }}
            error={formErrors.term}
            disabled={savingCourse}
          />

          {role === 'admin' ? (
            <Select
              label="Assigned instructor"
              value={formState.instructorId}
              onChange={(event) => {
                setFormState((prev) => ({
                  ...prev,
                  instructorId: event.target.value
                }));
                if (formErrors.instructorId) {
                  setFormErrors((prev) => ({
                    ...prev,
                    instructorId: undefined
                  }));
                }
              }}
              error={formErrors.instructorId}
              disabled={savingCourse || loadingInstructors}
              helperText={
                !loadingInstructors && instructors.length === 0
                  ? 'No active instructors found. Add or activate an instructor in Users first.'
                  : undefined
              }
            >
              <option value="">Select an instructor</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={String(inst.id)}>
                  {inst.fullName} ({inst.email})
                </option>
              ))}
            </Select>
          ) : null}

          <Textarea
            label="Description"
            placeholder="Short syllabus overview for students"
            value={formState.description}
            onChange={(event) => {
              setFormState((prev) => ({
                ...prev,
                description: event.target.value
              }));
              if (formErrors.description) {
                setFormErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            error={formErrors.description}
            disabled={savingCourse}
          />
        </form>
      </ModalSheet>

      {/* Drop Course ConfirmSheet */}
      <ConfirmSheet
        open={Boolean(dropTarget)}
        onClose={() => setDropTarget(null)}
        onConfirm={handleDropCourse}
        title="Drop this course?"
        description={
          dropTarget
            ? `You will be removed from ${dropTarget.courseCode} (${dropTarget.title}). You can re-enroll anytime from the catalog.`
            : ''
        }
        confirmLabel="Drop course"
        isLoading={dropping}
        error={dropError}
      />

      {/* Delete Course ConfirmSheet */}
      <ConfirmSheet
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCourse}
        title="Delete this course?"
        description={
          deleteTarget
            ? `This permanently deletes ${deleteTarget.courseCode} (${deleteTarget.title}), its enrollments, materials, assignments, submissions, and all stored files in cloud storage.`
            : ''
        }
        confirmLabel="Delete course"
        isLoading={deleting}
        error={deleteError}
      />
    </AppShell>
  );
}
