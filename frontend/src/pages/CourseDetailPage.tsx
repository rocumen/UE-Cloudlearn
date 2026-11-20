/**
 * Screen D: Course Detail Workspace (/courses/:id)
 * Purpose: Manage course overview, S3 learning materials, assignments, student submissions, and roster.
 * Single primary action per tab:
 *   - Materials (Instructor/Admin): "Upload material"
 *   - Assignments (Instructor/Admin): "Create assignment"
 *   - Unenrolled Student: "Enroll in course"
 */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ClipboardList,
  Download,
  FileText,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User as UserIcon,
  Users
} from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import {
  Badge,
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  ErrorBanner,
  FilePicker,
  Input,
  ModalSheet,
  SegmentedControl,
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
  formatShortDate,
  fromDatetimeLocalToIso,
  openPresignedDownload,
  toDatetimeLocalValue
} from '../lib/formatters';
import type {
  Assignment,
  Course,
  CourseMaterial,
  EnrolledStudent,
  SubmissionStatus
} from '../types/api';

type DetailTab = 'materials' | 'assignments' | 'students';

function getSubmissionBadge(status: SubmissionStatus): {
  label: string;
  variant: BadgeVariant;
} {
  if (status === 'graded') return { label: 'Graded', variant: 'success' };
  if (status === 'returned') return { label: 'Returned', variant: 'warning' };
  return { label: 'Submitted', variant: 'warning' };
}

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const courseId = Number(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const role = user?.role ?? 'student';
  const [activeTab, setActiveTab] = useState<DetailTab>('materials');

  const [course, setCourse] = useState<Course | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Student enroll / drop
  const [enrolling, setEnrolling] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  // Course edit modal
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseTerm, setCourseTerm] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseFormError, setCourseFormError] = useState<string | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);

  // Material modal & delete
  const [materialOpen, setMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<CourseMaterial | null>(null);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [matFileError, setMatFileError] = useState<string | null>(null);
  const [matTitleError, setMatTitleError] = useState<string | null>(null);
  const [matBannerError, setMatBannerError] = useState<string | null>(null);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [deleteMaterialTarget, setDeleteMaterialTarget] =
    useState<CourseMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState(false);
  const [deleteMaterialError, setDeleteMaterialError] = useState<string | null>(
    null
  );

  // Assignment modal & delete
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<Assignment | null>(null);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgInstructions, setAsgInstructions] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('');
  const [asgMaxScore, setAsgMaxScore] = useState('100');
  const [asgFile, setAsgFile] = useState<File | null>(null);
  const [asgFileError, setAsgFileError] = useState<string | null>(null);
  const [asgErrors, setAsgErrors] = useState<{
    title?: string;
    instructions?: string;
    dueDate?: string;
    maxScore?: string;
  }>({});
  const [asgBannerError, setAsgBannerError] = useState<string | null>(null);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] =
    useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState(false);
  const [deleteAssignmentError, setDeleteAssignmentError] = useState<
    string | null
  >(null);

  // Student submission modal & delete
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [subFile, setSubFile] = useState<File | null>(null);
  const [subFileError, setSubFileError] = useState<string | null>(null);
  const [subNote, setSubNote] = useState('');
  const [subBannerError, setSubBannerError] = useState<string | null>(null);
  const [submittingWork, setSubmittingWork] = useState(false);
  const [deleteSubTarget, setDeleteSubTarget] = useState<{
    id: number;
    assignmentTitle: string;
  } | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);
  const [deleteSubError, setDeleteSubError] = useState<string | null>(null);

  // Admin remove student from roster
  const [removeStudentTarget, setRemoveStudentTarget] =
    useState<EnrolledStudent | null>(null);
  const [removingStudent, setRemovingStudent] = useState(false);
  const [removeStudentError, setRemoveStudentError] = useState<string | null>(
    null
  );

  const canManageCourse = Boolean(
    course &&
      (role === 'admin' ||
        (role === 'instructor' && course.instructorId === user?.id))
  );

  const canViewContent = Boolean(
    course && (canManageCourse || (role === 'student' && course.isEnrolled))
  );

  const loadCourse = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isInteger(courseId) || courseId <= 0) {
        setCourseError('Course not found.');
        setCourseLoading(false);
        return;
      }

      setCourseLoading(true);
      setCourseError(null);
      try {
        const data = await api.get<{ course: Course }>(
          `/api/courses/${courseId}`,
          signal
        );
        setCourse(data.course);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setCourseError(
          err instanceof ApiError && err.status === 404
            ? 'This course could not be found.'
            : "We couldn't load this course. Check your connection and try again."
        );
      } finally {
        if (!signal?.aborted) {
          setCourseLoading(false);
        }
      }
    },
    [courseId]
  );

  const loadMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    setMaterialsError(null);
    try {
      const data = await api.get<{ materials: CourseMaterial[] }>(
        `/api/courses/${courseId}/materials`
      );
      setMaterials(data.materials);
    } catch (err) {
      setMaterialsError(
        err instanceof ApiError
          ? err.message
          : "We couldn't load learning materials."
      );
    } finally {
      setMaterialsLoading(false);
    }
  }, [courseId]);

  const loadAssignments = useCallback(async () => {
    setAssignmentsLoading(true);
    setAssignmentsError(null);
    try {
      const data = await api.get<{ assignments: Assignment[] }>(
        `/api/courses/${courseId}/assignments`
      );
      setAssignments(data.assignments);
    } catch (err) {
      setAssignmentsError(
        err instanceof ApiError
          ? err.message
          : "We couldn't load course assignments."
      );
    } finally {
      setAssignmentsLoading(false);
    }
  }, [courseId]);

  const loadStudents = useCallback(async () => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const data = await api.get<{ students: EnrolledStudent[] }>(
        `/api/courses/${courseId}/students`
      );
      setStudents(data.students);
    } catch (err) {
      setStudentsError(
        err instanceof ApiError
          ? err.message
          : "We couldn't load the student roster."
      );
    } finally {
      setStudentsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    const controller = new AbortController();
    void loadCourse(controller.signal);
    return () => controller.abort();
  }, [loadCourse]);

  useEffect(() => {
    if (!canViewContent) return;
    void loadMaterials();
    void loadAssignments();
    if (canManageCourse) {
      void loadStudents();
    }
  }, [canViewContent, canManageCourse, loadMaterials, loadAssignments, loadStudents]);

  const handleDownload = async (key: string, endpoint: string) => {
    setDownloadingKey(key);
    try {
      await openPresignedDownload(endpoint);
    } catch (err) {
      showToast({
        title:
          err instanceof ApiError
            ? err.message
            : 'Unable to prepare file download.',
        variant: 'error'
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    try {
      await api.post(`/api/courses/${course.id}/enroll`);
      showToast({
        title: `Enrolled in ${course.courseCode}.`,
        variant: 'success'
      });
      await loadCourse();
    } catch (err) {
      showToast({
        title:
          err instanceof ApiError
            ? err.message
            : 'Unable to enroll right now.',
        variant: 'error'
      });
    } finally {
      setEnrolling(false);
    }
  };

  const handleDropCourse = async () => {
    if (!course) return;
    setDropping(true);
    setDropError(null);
    try {
      await api.delete(`/api/courses/${course.id}/enroll`);
      showToast({
        title: `Dropped ${course.courseCode}.`,
        variant: 'info'
      });
      setDropOpen(false);
      await loadCourse();
    } catch (err) {
      setDropError(
        err instanceof ApiError
          ? err.message
          : 'Unable to drop this course.'
      );
    } finally {
      setDropping(false);
    }
  };

  const openEditCourseSheet = () => {
    if (!course) return;
    setCourseTitle(course.title);
    setCourseTerm(course.term);
    setCourseDesc(course.description ?? '');
    setCourseFormError(null);
    setEditCourseOpen(true);
  };

  const handleSaveCourseEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!course) return;
    if (courseTitle.trim().length < 2 || courseTerm.trim().length < 2) {
      setCourseFormError('Title and term must be at least 2 characters.');
      return;
    }

    setSavingCourse(true);
    setCourseFormError(null);
    try {
      await api.patch(`/api/courses/${course.id}`, {
        title: courseTitle.trim(),
        term: courseTerm.trim(),
        description: courseDesc.trim() ? courseDesc.trim() : null
      });
      showToast({ title: 'Course updated.', variant: 'success' });
      setEditCourseOpen(false);
      await loadCourse();
    } catch (err) {
      setCourseFormError(
        err instanceof ApiError
          ? err.message
          : 'Unable to update course details.'
      );
    } finally {
      setSavingCourse(false);
    }
  };

  const openCreateMaterial = () => {
    setEditingMaterial(null);
    setMatTitle('');
    setMatDesc('');
    setMatFile(null);
    setMatFileError(null);
    setMatTitleError(null);
    setMatBannerError(null);
    setMaterialOpen(true);
  };

  const openEditMaterial = (material: CourseMaterial) => {
    setEditingMaterial(material);
    setMatTitle(material.title);
    setMatDesc(material.description ?? '');
    setMatFile(null);
    setMatFileError(null);
    setMatTitleError(null);
    setMatBannerError(null);
    setMaterialOpen(true);
  };

  const handleSaveMaterial = async (event: FormEvent) => {
    event.preventDefault();
    setMatBannerError(null);
    setMatTitleError(null);
    setMatFileError(null);

    const trimmedTitle = matTitle.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 180) {
      setMatTitleError('Title must be between 2 and 180 characters.');
      return;
    }

    if (!editingMaterial && !matFile) {
      setMatFileError('Please choose a file to upload.');
      return;
    }

    setSavingMaterial(true);
    try {
      if (editingMaterial) {
        if (matFile) {
          const formData = new FormData();
          formData.append('title', trimmedTitle);
          formData.append('description', matDesc.trim());
          formData.append('file', matFile);
          await api.patch(`/api/materials/${editingMaterial.id}`, formData);
        } else {
          await api.patch(`/api/materials/${editingMaterial.id}`, {
            title: trimmedTitle,
            description: matDesc.trim() ? matDesc.trim() : null
          });
        }
        showToast({ title: 'Learning material updated.', variant: 'success' });
      } else if (matFile) {
        const formData = new FormData();
        formData.append('title', trimmedTitle);
        if (matDesc.trim()) {
          formData.append('description', matDesc.trim());
        }
        formData.append('file', matFile);
        await api.post(`/api/courses/${courseId}/materials`, formData);
        showToast({
          title: 'Material uploaded to cloud storage.',
          variant: 'success'
        });
      }

      setMaterialOpen(false);
      await loadMaterials();
      await loadCourse();
    } catch (err) {
      setMatBannerError(
        err instanceof ApiError
          ? err.message
          : 'Unable to save learning material.'
      );
    } finally {
      setSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deleteMaterialTarget) return;
    setDeletingMaterial(true);
    setDeleteMaterialError(null);
    try {
      await api.delete(`/api/materials/${deleteMaterialTarget.id}`);
      showToast({ title: 'Learning material deleted.', variant: 'success' });
      setDeleteMaterialTarget(null);
      await loadMaterials();
      await loadCourse();
    } catch (err) {
      setDeleteMaterialError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete learning material.'
      );
    } finally {
      setDeletingMaterial(false);
    }
  };

  const openCreateAssignment = () => {
    setEditingAssignment(null);
    setAsgTitle('');
    setAsgInstructions('');
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setAsgDueDate(toDatetimeLocalValue(nextWeek.toISOString()));
    setAsgMaxScore('100');
    setAsgFile(null);
    setAsgFileError(null);
    setAsgErrors({});
    setAsgBannerError(null);
    setAssignmentOpen(true);
  };

  const openEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAsgTitle(assignment.title);
    setAsgInstructions(assignment.instructions);
    setAsgDueDate(toDatetimeLocalValue(assignment.dueDate));
    setAsgMaxScore(String(assignment.maxScore));
    setAsgFile(null);
    setAsgFileError(null);
    setAsgErrors({});
    setAsgBannerError(null);
    setAssignmentOpen(true);
  };

  const handleSaveAssignment = async (event: FormEvent) => {
    event.preventDefault();
    setAsgBannerError(null);

    const nextErrors: typeof asgErrors = {};
    if (asgTitle.trim().length < 2 || asgTitle.trim().length > 180) {
      nextErrors.title = 'Title must be between 2 and 180 characters.';
    }
    if (
      asgInstructions.trim().length < 2 ||
      asgInstructions.trim().length > 5000
    ) {
      nextErrors.instructions = 'Instructions must be at least 2 characters.';
    }
    const isoDueDate = fromDatetimeLocalToIso(asgDueDate);
    if (!isoDueDate) {
      nextErrors.dueDate = 'Please choose a valid due date and time.';
    }
    const parsedMax = Number(asgMaxScore);
    if (!Number.isInteger(parsedMax) || parsedMax <= 0 || parsedMax > 10000) {
      nextErrors.maxScore = 'Max score must be a whole number from 1 to 10,000.';
    }

    setAsgErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || asgFileError) return;

    setSavingAssignment(true);
    try {
      if (editingAssignment) {
        if (asgFile) {
          const formData = new FormData();
          formData.append('title', asgTitle.trim());
          formData.append('instructions', asgInstructions.trim());
          formData.append('dueDate', isoDueDate);
          formData.append('maxScore', String(parsedMax));
          formData.append('attachment', asgFile);
          await api.patch(`/api/assignments/${editingAssignment.id}`, formData);
        } else {
          await api.patch(`/api/assignments/${editingAssignment.id}`, {
            title: asgTitle.trim(),
            instructions: asgInstructions.trim(),
            dueDate: isoDueDate,
            maxScore: parsedMax
          });
        }
        showToast({ title: 'Assignment updated.', variant: 'success' });
      } else {
        const formData = new FormData();
        formData.append('title', asgTitle.trim());
        formData.append('instructions', asgInstructions.trim());
        formData.append('dueDate', isoDueDate);
        formData.append('maxScore', String(parsedMax));
        if (asgFile) {
          formData.append('attachment', asgFile);
        }
        await api.post(`/api/courses/${courseId}/assignments`, formData);
        showToast({ title: 'Assignment created.', variant: 'success' });
      }

      setAssignmentOpen(false);
      await loadAssignments();
      await loadCourse();
    } catch (err) {
      setAsgBannerError(
        err instanceof ApiError
          ? err.message
          : 'Unable to save assignment.'
      );
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deleteAssignmentTarget) return;
    setDeletingAssignment(true);
    setDeleteAssignmentError(null);
    try {
      await api.delete(`/api/assignments/${deleteAssignmentTarget.id}`);
      showToast({ title: 'Assignment deleted.', variant: 'success' });
      setDeleteAssignmentTarget(null);
      await loadAssignments();
      await loadCourse();
    } catch (err) {
      setDeleteAssignmentError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete assignment.'
      );
    } finally {
      setDeletingAssignment(false);
    }
  };

  const openSubmitWorkSheet = (assignment: Assignment) => {
    setSubmitTarget(assignment);
    setSubFile(null);
    setSubFileError(null);
    setSubNote('');
    setSubBannerError(null);
  };

  const handleSubmitWork = async (event: FormEvent) => {
    event.preventDefault();
    if (!submitTarget) return;
    setSubBannerError(null);
    if (!subFile) {
      setSubFileError('Please choose your submission file to upload.');
      return;
    }

    setSubmittingWork(true);
    try {
      const formData = new FormData();
      formData.append('file', subFile);
      if (subNote.trim()) {
        formData.append('studentNote', subNote.trim());
      }
      await api.post(
        `/api/assignments/${submitTarget.id}/submissions`,
        formData
      );
      showToast({
        title: submitTarget.mySubmission
          ? 'Submission replaced.'
          : 'Assignment submitted.',
        variant: 'success'
      });
      setSubmitTarget(null);
      await loadAssignments();
    } catch (err) {
      setSubBannerError(
        err instanceof ApiError
          ? err.message
          : 'Unable to upload submission. Please try again.'
      );
    } finally {
      setSubmittingWork(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!deleteSubTarget) return;
    setDeletingSub(true);
    setDeleteSubError(null);
    try {
      await api.delete(`/api/submissions/${deleteSubTarget.id}`);
      showToast({ title: 'Submission deleted.', variant: 'info' });
      setDeleteSubTarget(null);
      await loadAssignments();
    } catch (err) {
      setDeleteSubError(
        err instanceof ApiError
          ? err.message
          : 'Unable to delete submission.'
      );
    } finally {
      setDeletingSub(false);
    }
  };

  const handleRemoveStudent = async () => {
    if (!removeStudentTarget || !course) return;
    setRemovingStudent(true);
    setRemoveStudentError(null);
    try {
      await api.delete(
        `/api/courses/${course.id}/enroll?studentId=${removeStudentTarget.studentId}`
      );
      showToast({
        title: `Removed ${removeStudentTarget.fullName} from ${course.courseCode}.`,
        variant: 'info'
      });
      setRemoveStudentTarget(null);
      await loadStudents();
      await loadCourse();
    } catch (err) {
      setRemoveStudentError(
        err instanceof ApiError
          ? err.message
          : 'Unable to remove student from course.'
      );
    } finally {
      setRemovingStudent(false);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <Link
            to="/courses"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] px-2 -ml-2 text-[0.9375rem] font-medium text-secondary hover:bg-subtle hover:text-primary apple-transition apple-focus-ring"
          >
            <ArrowLeft
              className="h-4 w-4"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span>Back to courses</span>
          </Link>
        </div>

        {courseLoading ? (
          <div className="space-y-6">
            <Card>
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="mt-3 h-9 w-2/3" />
              <Skeleton className="mt-2 h-5 w-full" />
              <Skeleton className="mt-4 h-4 w-48" />
            </Card>
            <Card>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="mt-3 h-14 w-full" />
            </Card>
          </div>
        ) : courseError || !course ? (
          <ErrorBanner
            message={courseError || 'Course not found.'}
            onRetry={() => void loadCourse()}
          />
        ) : (
          <>
            {/* Course Summary Card */}
            <Card padding="md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="crimson">{course.courseCode}</Badge>
                    <Badge variant="neutral">{course.term}</Badge>
                    {role === 'student' && course.isEnrolled ? (
                      <Badge variant="success">Enrolled</Badge>
                    ) : null}
                  </div>

                  <h1 className="text-[1.625rem] sm:text-[2rem] font-bold tracking-[-0.02em] leading-tight text-primary">
                    {course.title}
                  </h1>

                  <p className="text-[0.9375rem] text-secondary">
                    {course.description ||
                      'Course handouts, assignments, and grades are organized below.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-[0.875rem] text-secondary">
                    <span className="inline-flex items-center gap-1.5">
                      <UserIcon
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>{course.instructorName || 'Instructor'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>
                        {course.activeStudentCount}{' '}
                        {course.activeStudentCount === 1
                          ? 'student'
                          : 'students'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {role === 'student' ? (
                    course.isEnrolled ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDropError(null);
                          setDropOpen(true);
                        }}
                      >
                        Drop course
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        isLoading={enrolling}
                        loadingText="Enrolling..."
                        onClick={() => void handleEnroll()}
                      >
                        Enroll in course
                      </Button>
                    )
                  ) : null}

                  {canManageCourse ? (
                    <Button variant="outline" onClick={openEditCourseSheet}>
                      <Pencil
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>Edit course</span>
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>

            {/* Course Workspace Content */}
            {!canViewContent ? (
              <Card>
                <EmptyState
                  icon={BookOpen}
                  title={
                    role === 'student'
                      ? 'Enroll to access course materials and assignments'
                      : 'Assigned instructor access only'
                  }
                  description={
                    role === 'student'
                      ? 'Once enrolled, you can download handouts and upload assignment submissions.'
                      : 'Only the assigned instructor or an administrator can open materials and student submissions for this course.'
                  }
                  action={
                    role === 'student' ? (
                      <Button
                        variant="primary"
                        isLoading={enrolling}
                        loadingText="Enrolling..."
                        onClick={() => void handleEnroll()}
                      >
                        Enroll in course
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => navigate('/courses')}
                      >
                        Back to courses
                      </Button>
                    )
                  }
                />
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <SegmentedControl
                    label="Course sections"
                    value={activeTab}
                    onChange={setActiveTab}
                    options={[
                      {
                        value: 'materials',
                        label: 'Materials',
                        count: materials.length
                      },
                      {
                        value: 'assignments',
                        label: 'Assignments',
                        count: assignments.length
                      },
                      ...(canManageCourse
                        ? [
                            {
                              value: 'students' as const,
                              label: 'Students',
                              count: students.length
                            }
                          ]
                        : [])
                    ]}
                  />

                  {canManageCourse && activeTab === 'materials' ? (
                    <Button
                      variant="primary"
                      onClick={openCreateMaterial}
                      className="self-start sm:self-auto"
                    >
                      <Upload
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>Upload material</span>
                    </Button>
                  ) : null}

                  {canManageCourse && activeTab === 'assignments' ? (
                    <Button
                      variant="primary"
                      onClick={openCreateAssignment}
                      className="self-start sm:self-auto"
                    >
                      <Plus
                        className="h-4 w-4"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span>Create assignment</span>
                    </Button>
                  ) : null}
                </div>

                {/* Materials Tab */}
                {activeTab === 'materials' ? (
                  materialsLoading ? (
                    <Card padding="none">
                      <div className="divide-y divide-hairline">
                        {[1, 2, 3].map((idx) => (
                          <div key={idx} className="p-4 sm:px-6">
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : materialsError ? (
                    <ErrorBanner
                      message={materialsError}
                      onRetry={() => void loadMaterials()}
                    />
                  ) : materials.length === 0 ? (
                    <Card>
                      <EmptyState
                        icon={FileText}
                        title="No learning materials yet"
                        description={
                          canManageCourse
                            ? 'Upload slides, PDFs, or reference files for students.'
                            : 'Handouts published by your instructor will appear here.'
                        }
                        action={
                          canManageCourse ? (
                            <Button
                              variant="primary"
                              onClick={openCreateMaterial}
                            >
                              Upload material
                            </Button>
                          ) : undefined
                        }
                      />
                    </Card>
                  ) : (
                    <Card padding="none">
                      <div className="divide-y divide-hairline">
                        {materials.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-subtle text-secondary">
                                <FileText
                                  className="h-5 w-5"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                              </span>
                              <div className="min-w-0">
                                <p className="text-[0.9375rem] font-semibold text-primary">
                                  {mat.title}
                                </p>
                                {mat.description ? (
                                  <p className="mt-0.5 text-[0.875rem] text-secondary">
                                    {mat.description}
                                  </p>
                                ) : null}
                                <p className="mt-1 truncate text-[0.8125rem] text-secondary">
                                  {mat.fileName} · {formatFileSize(mat.fileSize)}{' '}
                                  · {formatShortDate(mat.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                              <Button
                                variant={canManageCourse ? 'outline' : 'primary'}
                                isLoading={downloadingKey === `mat-${mat.id}`}
                                loadingText="Opening..."
                                onClick={() =>
                                  void handleDownload(
                                    `mat-${mat.id}`,
                                    `/api/materials/${mat.id}/download`
                                  )
                                }
                              >
                                <Download
                                  className="h-4 w-4"
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                                <span>Download</span>
                              </Button>

                              {canManageCourse ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Edit ${mat.title}`}
                                    onClick={() => openEditMaterial(mat)}
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
                                    aria-label={`Delete ${mat.title}`}
                                    onClick={() => {
                                      setDeleteMaterialError(null);
                                      setDeleteMaterialTarget(mat);
                                    }}
                                  >
                                    <Trash2
                                      className="h-4 w-4"
                                      strokeWidth={1.75}
                                      aria-hidden="true"
                                    />
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                ) : null}

                {/* Assignments Tab */}
                {activeTab === 'assignments' ? (
                  assignmentsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((idx) => (
                        <Card key={idx}>
                          <Skeleton className="h-6 w-1/2" />
                          <Skeleton className="mt-2 h-12 w-full" />
                          <Skeleton className="mt-4 h-11 w-40" />
                        </Card>
                      ))}
                    </div>
                  ) : assignmentsError ? (
                    <ErrorBanner
                      message={assignmentsError}
                      onRetry={() => void loadAssignments()}
                    />
                  ) : assignments.length === 0 ? (
                    <Card>
                      <EmptyState
                        icon={ClipboardList}
                        title="No assignments yet"
                        description={
                          canManageCourse
                            ? 'Create an assignment with instructions, due date, and optional reference attachment.'
                            : 'Assignments posted by your instructor will appear here.'
                        }
                        action={
                          canManageCourse ? (
                            <Button
                              variant="primary"
                              onClick={openCreateAssignment}
                            >
                              Create assignment
                            </Button>
                          ) : undefined
                        }
                      />
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {assignments.map((asg) => {
                        const mySub = asg.mySubmission ?? null;
                        const subBadge = mySub
                          ? getSubmissionBadge(mySub.status)
                          : null;

                        return (
                          <Card key={asg.id} padding="md">
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0 space-y-1.5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-[1.0625rem] font-semibold text-primary">
                                      {asg.title}
                                    </h2>
                                    {subBadge ? (
                                      <Badge variant={subBadge.variant}>
                                        {subBadge.label}
                                      </Badge>
                                    ) : role === 'student' ? (
                                      <Badge variant="neutral">Not submitted</Badge>
                                    ) : null}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-secondary">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Calendar
                                        className="h-4 w-4"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                      />
                                      <span>Due {formatDateTime(asg.dueDate)}</span>
                                    </span>
                                    <span>Max {asg.maxScore} pts</span>
                                  </div>
                                </div>

                                {canManageCourse ? (
                                  <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        navigate(
                                          `/courses/${course.id}/assignments/${asg.id}`
                                        )
                                      }
                                    >
                                      Review ({asg.submissionCount ?? 0})
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      aria-label={`Edit ${asg.title}`}
                                      onClick={() => openEditAssignment(asg)}
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
                                      aria-label={`Delete ${asg.title}`}
                                      onClick={() => {
                                        setDeleteAssignmentError(null);
                                        setDeleteAssignmentTarget(asg);
                                      }}
                                    >
                                      <Trash2
                                        className="h-4 w-4"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                      />
                                    </Button>
                                  </div>
                                ) : null}
                              </div>

                              <p className="whitespace-pre-line text-[0.9375rem] text-secondary">
                                {asg.instructions}
                              </p>

                              {asg.attachmentFileName ? (
                                <div>
                                  <Button
                                    variant="secondary"
                                    isLoading={
                                      downloadingKey === `asg-att-${asg.id}`
                                    }
                                    loadingText="Opening..."
                                    onClick={() =>
                                      void handleDownload(
                                        `asg-att-${asg.id}`,
                                        `/api/assignments/${asg.id}/attachment`
                                      )
                                    }
                                  >
                                    <Download
                                      className="h-4 w-4"
                                      strokeWidth={1.75}
                                      aria-hidden="true"
                                    />
                                    <span>
                                      Reference: {asg.attachmentFileName}
                                    </span>
                                  </Button>
                                </div>
                              ) : null}

                              {canManageCourse ? (
                                <div className="border-t border-hairline pt-3 text-[0.8125rem] text-secondary">
                                  {asg.submissionCount ?? 0} submitted ·{' '}
                                  {asg.gradedCount ?? 0} graded
                                </div>
                              ) : null}

                              {role === 'student' ? (
                                <div className="border-t border-hairline pt-3">
                                  {mySub ? (
                                    <div className="space-y-3 rounded-[14px] bg-subtle p-4">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                          <p className="truncate text-[0.9375rem] font-semibold text-primary">
                                            {mySub.fileName}
                                          </p>
                                          <p className="text-[0.8125rem] text-secondary">
                                            Submitted{' '}
                                            {formatDateTime(mySub.submittedAt)}
                                          </p>
                                        </div>

                                        {mySub.score !== null ? (
                                          <p className="text-[1.125rem] font-bold text-primary tabular-nums">
                                            {mySub.score} / {asg.maxScore}
                                          </p>
                                        ) : null}
                                      </div>

                                      {mySub.feedback ? (
                                        <p className="rounded-[10px] border border-hairline bg-surface px-3.5 py-2.5 text-[0.875rem] text-primary">
                                          <span className="font-medium">
                                            Instructor feedback:
                                          </span>{' '}
                                          {mySub.feedback}
                                        </p>
                                      ) : null}

                                      <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                          variant="outline"
                                          isLoading={
                                            downloadingKey === `sub-${mySub.id}`
                                          }
                                          loadingText="Opening..."
                                          onClick={() =>
                                            void handleDownload(
                                              `sub-${mySub.id}`,
                                              `/api/submissions/${mySub.id}/download`
                                            )
                                          }
                                        >
                                          <Download
                                            className="h-4 w-4"
                                            strokeWidth={1.75}
                                            aria-hidden="true"
                                          />
                                          <span>Download my file</span>
                                        </Button>

                                        {mySub.status !== 'graded' ? (
                                          <>
                                            <Button
                                              variant="primary"
                                              onClick={() =>
                                                openSubmitWorkSheet(asg)
                                              }
                                            >
                                              Replace submission
                                            </Button>
                                            <Button
                                              variant="danger"
                                              onClick={() => {
                                                setDeleteSubError(null);
                                                setDeleteSubTarget({
                                                  id: mySub.id,
                                                  assignmentTitle: asg.title
                                                });
                                              }}
                                            >
                                              Delete submission
                                            </Button>
                                          </>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="primary"
                                      onClick={() => openSubmitWorkSheet(asg)}
                                    >
                                      <Upload
                                        className="h-4 w-4"
                                        strokeWidth={1.75}
                                        aria-hidden="true"
                                      />
                                      <span>Submit work</span>
                                    </Button>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )
                ) : null}

                {/* Students Tab (Instructor/Admin) */}
                {activeTab === 'students' && canManageCourse ? (
                  studentsLoading ? (
                    <Card padding="none">
                      <div className="divide-y divide-hairline">
                        {[1, 2, 3].map((idx) => (
                          <div key={idx} className="p-4 sm:px-6">
                            <Skeleton className="h-12 w-full" />
                          </div>
                        ))}
                      </div>
                    </Card>
                  ) : studentsError ? (
                    <ErrorBanner
                      message={studentsError}
                      onRetry={() => void loadStudents()}
                    />
                  ) : students.length === 0 ? (
                    <Card>
                      <EmptyState
                        icon={Users}
                        title="No enrolled students yet"
                        description="Students who enroll in this course will appear here."
                      />
                    </Card>
                  ) : (
                    <Card padding="none">
                      <div className="divide-y divide-hairline">
                        {students.map((student) => (
                          <div
                            key={student.enrollmentId}
                            className="flex min-h-[60px] flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
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
                                  {student.fullName}
                                </p>
                                <p className="truncate text-[0.8125rem] text-secondary">
                                  {student.email} · Enrolled{' '}
                                  {formatShortDate(student.enrolledAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Badge
                                variant={
                                  student.status === 'active'
                                    ? 'success'
                                    : student.status === 'completed'
                                      ? 'crimson'
                                      : 'neutral'
                                }
                              >
                                {student.status === 'active'
                                  ? 'Active'
                                  : student.status === 'completed'
                                    ? 'Completed'
                                    : 'Dropped'}
                              </Badge>

                              {role === 'admin' ? (
                                <Button
                                  variant="danger"
                                  onClick={() => {
                                    setRemoveStudentError(null);
                                    setRemoveStudentTarget(student);
                                  }}
                                >
                                  Remove
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )
                ) : null}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Course ModalSheet */}
      <ModalSheet
        open={editCourseOpen}
        onClose={() => (savingCourse ? undefined : setEditCourseOpen(false))}
        title="Edit course"
        subtitle="Update course title, term, or syllabus description."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setEditCourseOpen(false)}
              disabled={savingCourse}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="course-detail-edit-form"
              variant="primary"
              isLoading={savingCourse}
              loadingText="Saving..."
              className="w-full sm:w-auto"
            >
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="course-detail-edit-form"
          onSubmit={handleSaveCourseEdit}
          noValidate
          className="space-y-4"
        >
          {courseFormError ? <ErrorBanner message={courseFormError} /> : null}
          <Input
            label="Course title"
            value={courseTitle}
            onChange={(event) => setCourseTitle(event.target.value)}
            disabled={savingCourse}
          />
          <Input
            label="Academic term"
            value={courseTerm}
            onChange={(event) => setCourseTerm(event.target.value)}
            disabled={savingCourse}
          />
          <Textarea
            label="Description"
            value={courseDesc}
            onChange={(event) => setCourseDesc(event.target.value)}
            disabled={savingCourse}
          />
        </form>
      </ModalSheet>

      {/* Upload / Edit Material ModalSheet */}
      <ModalSheet
        open={materialOpen}
        onClose={() => (savingMaterial ? undefined : setMaterialOpen(false))}
        title={editingMaterial ? 'Edit material' : 'Upload material'}
        subtitle={
          editingMaterial
            ? 'Update metadata or upload a replacement file.'
            : 'Files are stored securely in Amazon S3.'
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setMaterialOpen(false)}
              disabled={savingMaterial}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="material-form"
              variant="primary"
              isLoading={savingMaterial}
              loadingText={editingMaterial ? 'Saving...' : 'Uploading...'}
              className="w-full sm:w-auto"
            >
              {editingMaterial ? 'Save changes' : 'Upload material'}
            </Button>
          </>
        }
      >
        <form
          id="material-form"
          onSubmit={handleSaveMaterial}
          noValidate
          className="space-y-4"
        >
          {matBannerError ? <ErrorBanner message={matBannerError} /> : null}
          <Input
            label="Title"
            placeholder="Week 1: Cloud Architecture Slides"
            value={matTitle}
            onChange={(event) => {
              setMatTitle(event.target.value);
              if (matTitleError) setMatTitleError(null);
            }}
            error={matTitleError ?? undefined}
            disabled={savingMaterial}
          />
          <Textarea
            label="Description (optional)"
            placeholder="Short handout notes for students"
            value={matDesc}
            onChange={(event) => setMatDesc(event.target.value)}
            disabled={savingMaterial}
          />
          <FilePicker
            label={editingMaterial ? 'Replacement file (optional)' : 'File'}
            file={matFile}
            existingFileName={editingMaterial?.fileName ?? null}
            error={matFileError}
            required={!editingMaterial}
            disabled={savingMaterial}
            onChange={(file, err) => {
              setMatFile(file);
              setMatFileError(err);
            }}
          />
        </form>
      </ModalSheet>

      {/* Create / Edit Assignment ModalSheet */}
      <ModalSheet
        open={assignmentOpen}
        onClose={() =>
          savingAssignment ? undefined : setAssignmentOpen(false)
        }
        title={editingAssignment ? 'Edit assignment' : 'Create assignment'}
        subtitle="Set instructions, deadline, maximum score, and an optional reference attachment."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setAssignmentOpen(false)}
              disabled={savingAssignment}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="assignment-form"
              variant="primary"
              isLoading={savingAssignment}
              loadingText={editingAssignment ? 'Saving...' : 'Creating...'}
              className="w-full sm:w-auto"
            >
              {editingAssignment ? 'Save changes' : 'Create assignment'}
            </Button>
          </>
        }
      >
        <form
          id="assignment-form"
          onSubmit={handleSaveAssignment}
          noValidate
          className="space-y-4"
        >
          {asgBannerError ? <ErrorBanner message={asgBannerError} /> : null}
          <Input
            label="Title"
            placeholder="Lab 1: VPC & Subnet Design"
            value={asgTitle}
            onChange={(event) => {
              setAsgTitle(event.target.value);
              if (asgErrors.title) {
                setAsgErrors((prev) => ({ ...prev, title: undefined }));
              }
            }}
            error={asgErrors.title}
            disabled={savingAssignment}
          />
          <Textarea
            label="Instructions"
            placeholder="Describe what students should prepare and submit"
            value={asgInstructions}
            onChange={(event) => {
              setAsgInstructions(event.target.value);
              if (asgErrors.instructions) {
                setAsgErrors((prev) => ({ ...prev, instructions: undefined }));
              }
            }}
            error={asgErrors.instructions}
            disabled={savingAssignment}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Due date & time"
              type="datetime-local"
              value={asgDueDate}
              onChange={(event) => {
                setAsgDueDate(event.target.value);
                if (asgErrors.dueDate) {
                  setAsgErrors((prev) => ({ ...prev, dueDate: undefined }));
                }
              }}
              error={asgErrors.dueDate}
              disabled={savingAssignment}
            />
            <Input
              label="Max score"
              type="number"
              min={1}
              max={10000}
              value={asgMaxScore}
              onChange={(event) => {
                setAsgMaxScore(event.target.value);
                if (asgErrors.maxScore) {
                  setAsgErrors((prev) => ({ ...prev, maxScore: undefined }));
                }
              }}
              error={asgErrors.maxScore}
              disabled={savingAssignment}
            />
          </div>
          <FilePicker
            label="Reference attachment (optional)"
            file={asgFile}
            existingFileName={editingAssignment?.attachmentFileName ?? null}
            error={asgFileError}
            disabled={savingAssignment}
            onChange={(file, err) => {
              setAsgFile(file);
              setAsgFileError(err);
            }}
          />
        </form>
      </ModalSheet>

      {/* Student Submit Work ModalSheet */}
      <ModalSheet
        open={Boolean(submitTarget)}
        onClose={() => (submittingWork ? undefined : setSubmitTarget(null))}
        title={
          submitTarget?.mySubmission ? 'Replace submission' : 'Submit work'
        }
        subtitle={submitTarget ? submitTarget.title : undefined}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSubmitTarget(null)}
              disabled={submittingWork}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="submission-upload-form"
              variant="primary"
              isLoading={submittingWork}
              loadingText="Uploading..."
              className="w-full sm:w-auto"
            >
              {submitTarget?.mySubmission
                ? 'Replace submission'
                : 'Submit assignment'}
            </Button>
          </>
        }
      >
        <form
          id="submission-upload-form"
          onSubmit={handleSubmitWork}
          noValidate
          className="space-y-4"
        >
          {subBannerError ? <ErrorBanner message={subBannerError} /> : null}
          <FilePicker
            label="Submission file"
            file={subFile}
            existingFileName={submitTarget?.mySubmission?.fileName ?? null}
            error={subFileError}
            required
            disabled={submittingWork}
            onChange={(file, err) => {
              setSubFile(file);
              setSubFileError(err);
            }}
          />
          <Textarea
            label="Note for instructor (optional)"
            placeholder="Add any helpful notes about your submission"
            value={subNote}
            onChange={(event) => setSubNote(event.target.value)}
            disabled={submittingWork}
          />
        </form>
      </ModalSheet>

      {/* Destructive Confirmation Sheets */}
      <ConfirmSheet
        open={dropOpen}
        onClose={() => setDropOpen(false)}
        onConfirm={handleDropCourse}
        title="Drop this course?"
        description={
          course
            ? `You will be removed from ${course.courseCode} (${course.title}).`
            : ''
        }
        confirmLabel="Drop course"
        isLoading={dropping}
        error={dropError}
      />

      <ConfirmSheet
        open={Boolean(deleteMaterialTarget)}
        onClose={() => setDeleteMaterialTarget(null)}
        onConfirm={handleDeleteMaterial}
        title="Delete learning material?"
        description={
          deleteMaterialTarget
            ? `This permanently deletes "${deleteMaterialTarget.title}" and its file (${deleteMaterialTarget.fileName}) from cloud storage.`
            : ''
        }
        confirmLabel="Delete material"
        isLoading={deletingMaterial}
        error={deleteMaterialError}
      />

      <ConfirmSheet
        open={Boolean(deleteAssignmentTarget)}
        onClose={() => setDeleteAssignmentTarget(null)}
        onConfirm={handleDeleteAssignment}
        title="Delete assignment?"
        description={
          deleteAssignmentTarget
            ? `This permanently deletes "${deleteAssignmentTarget.title}", its reference attachment, and all student submissions stored in cloud storage.`
            : ''
        }
        confirmLabel="Delete assignment"
        isLoading={deletingAssignment}
        error={deleteAssignmentError}
      />

      <ConfirmSheet
        open={Boolean(deleteSubTarget)}
        onClose={() => setDeleteSubTarget(null)}
        onConfirm={handleDeleteSubmission}
        title="Delete submission?"
        description={
          deleteSubTarget
            ? `Your uploaded file for "${deleteSubTarget.assignmentTitle}" will be removed from cloud storage.`
            : ''
        }
        confirmLabel="Delete submission"
        isLoading={deletingSub}
        error={deleteSubError}
      />

      <ConfirmSheet
        open={Boolean(removeStudentTarget)}
        onClose={() => setRemoveStudentTarget(null)}
        onConfirm={handleRemoveStudent}
        title="Remove student from course?"
        description={
          removeStudentTarget && course
            ? `${removeStudentTarget.fullName} will be removed from ${course.courseCode}.`
            : ''
        }
        confirmLabel="Remove student"
        isLoading={removingStudent}
        error={removeStudentError}
      />
    </AppShell>
  );
}
