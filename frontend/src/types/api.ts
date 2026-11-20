export type UserRole = 'admin' | 'instructor' | 'student';
export type UserStatus = 'active' | 'inactive';
export type EnrollmentStatus = 'active' | 'completed' | 'dropped';
export type SubmissionStatus = 'submitted' | 'graded' | 'returned';

export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string | null;
  updatedAt?: string | null;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiFieldError[];
  };
}

export interface StudentUpcomingAssignment {
  assignmentId: number;
  title: string;
  dueDate: string;
  maxScore: number;
  courseId: number;
  courseCode: string;
  courseTitle: string;
}

export interface StudentRecentGrade {
  submissionId: number;
  assignmentId: number;
  assignmentTitle: string;
  maxScore: number;
  courseId: number;
  courseCode: string;
  score: number;
  feedback: string | null;
  status: 'graded' | 'returned';
  gradedAt: string | null;
}

export interface StudentDashboardSummary {
  role: 'student';
  kpis: {
    enrolledCourses: number;
    pendingAssignments: number;
    averagePercent: number | null;
  };
  upcomingAssignments: StudentUpcomingAssignment[];
  recentGrades: StudentRecentGrade[];
}

export interface InstructorRecentSubmission {
  submissionId: number;
  assignmentId: number;
  assignmentTitle: string;
  courseId: number;
  courseCode: string;
  studentId: number;
  studentName: string;
  fileName: string;
  status: SubmissionStatus;
  submittedAt: string;
}

export interface InstructorDashboardCourse {
  id: number;
  courseCode: string;
  title: string;
  term: string;
  activeStudentCount: number;
}

export interface InstructorDashboardSummary {
  role: 'instructor';
  kpis: {
    assignedCourses: number;
    pendingToGrade: number;
    totalStudents: number;
  };
  recentSubmissions: InstructorRecentSubmission[];
  courses: InstructorDashboardCourse[];
}

export interface AdminRecentCourse {
  id: number;
  courseCode: string;
  title: string;
  term: string;
  instructorName: string;
  createdAt: string;
}

export interface AdminDashboardSummary {
  role: 'admin';
  kpis: {
    totalUsers: number;
    totalCourses: number;
    totalEnrollments: number;
  };
  recentUsers: User[];
  recentCourses: AdminRecentCourse[];
}

export type DashboardSummary =
  | StudentDashboardSummary
  | InstructorDashboardSummary
  | AdminDashboardSummary;

export interface Course {
  id: number;
  courseCode: string;
  title: string;
  description: string | null;
  term: string;
  instructorId: number;
  instructorName: string | null;
  instructorEmail?: string | null;
  activeStudentCount: number;
  isEnrolled: boolean;
  enrollmentStatus: EnrollmentStatus | null;
  materialCount?: number;
  assignmentCount?: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CourseMaterial {
  id: number;
  courseId: number;
  uploadedBy: number;
  uploaderName: string | null;
  title: string;
  description: string | null;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: number;
  courseId: number;
  createdBy: number;
  creatorName: string | null;
  title: string;
  instructions: string;
  dueDate: string;
  maxScore: number;
  attachmentFileName: string | null;
  attachmentS3Key: string | null;
  createdAt: string;
  updatedAt: string;
  mySubmission?: {
    id: number;
    fileName: string;
    status: SubmissionStatus;
    score: number | null;
    feedback: string | null;
    submittedAt: string;
    gradedAt: string | null;
  } | null;
  submissionCount?: number;
  gradedCount?: number;
}

export interface Submission {
  id: number;
  assignmentId: number;
  assignmentTitle?: string;
  maxScore?: number;
  courseId?: number;
  courseCode?: string;
  courseTitle?: string;
  studentId: number;
  studentName?: string;
  studentEmail?: string;
  fileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  studentNote: string | null;
  score: number | null;
  feedback: string | null;
  status: SubmissionStatus;
  submittedAt: string;
  gradedAt: string | null;
  updatedAt: string;
}

export interface StudentLearningRecordItem {
  assignmentId: number;
  title: string;
  dueDate: string;
  maxScore: number;
  submissionId: number | null;
  status: SubmissionStatus | 'not_submitted';
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
}

export interface StudentLearningRecordCourse {
  courseId: number;
  courseCode: string;
  courseTitle: string;
  instructorName: string;
  enrollmentStatus: EnrollmentStatus;
  courseAveragePercent: number | null;
  items: StudentLearningRecordItem[];
}

export interface StudentLearningRecords {
  summary: {
    enrolledCoursesCount: number;
    totalAssignments: number;
    submittedCount: number;
    gradedCount: number;
    averagePercent: number | null;
  };
  courses: StudentLearningRecordCourse[];
}

export interface EnrolledStudent {
  enrollmentId: number;
  studentId: number;
  fullName: string;
  email: string;
  status: EnrollmentStatus;
  enrolledAt: string;
}

export interface PresignedDownloadResponse {
  url: string;
  expiresIn: number;
  fileName: string;
  mimeType?: string;
}
