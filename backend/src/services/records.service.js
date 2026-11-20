import { mapUserRow } from '../utils/response.js';

function roundPercent(value) {
  return Math.round(value * 100) / 100;
}

export async function getStudentLearningRecords(db, studentId) {
  const [rows] = await db.execute(
    `SELECT
       c.id AS course_id,
       c.course_code,
       c.title AS course_title,
       u.full_name AS instructor_name,
       e.status AS enrollment_status,
       a.id AS assignment_id,
       a.title AS assignment_title,
       a.due_date,
       a.max_score,
       s.id AS submission_id,
       s.status AS submission_status,
       s.score,
       s.feedback,
       s.submitted_at,
       s.graded_at
     FROM enrollments AS e
     INNER JOIN courses AS c ON c.id = e.course_id
     INNER JOIN users AS u ON u.id = c.instructor_id
     LEFT JOIN assignments AS a ON a.course_id = c.id
     LEFT JOIN submissions AS s ON s.assignment_id = a.id AND s.student_id = e.student_id
     WHERE e.student_id = ? AND e.status IN ('active', 'completed')
     ORDER BY c.course_code ASC, a.due_date ASC, a.id ASC`,
    [studentId]
  );

  const courseMap = new Map();
  let totalAssignments = 0;
  let submittedCount = 0;
  let gradedCount = 0;
  let overallPercentSum = 0;

  for (const row of rows) {
    if (!courseMap.has(row.course_id)) {
      courseMap.set(row.course_id, {
        courseId: row.course_id,
        courseCode: row.course_code,
        courseTitle: row.course_title,
        instructorName: row.instructor_name,
        enrollmentStatus: row.enrollment_status,
        _percentSum: 0,
        _gradedCount: 0,
        courseAveragePercent: null,
        items: []
      });
    }

    const courseEntry = courseMap.get(row.course_id);
    if (row.assignment_id !== null && row.assignment_id !== undefined) {
      totalAssignments += 1;
      const hasSubmission =
        row.submission_id !== null && row.submission_id !== undefined;
      if (hasSubmission) {
        submittedCount += 1;
      }

      const maxScore = Number(row.max_score);
      const score =
        row.score !== null && row.score !== undefined ? Number(row.score) : null;
      const isGraded =
        hasSubmission &&
        score !== null &&
        (row.submission_status === 'graded' ||
          row.submission_status === 'returned');

      if (isGraded && maxScore > 0) {
        const pct = (score / maxScore) * 100;
        courseEntry._percentSum += pct;
        courseEntry._gradedCount += 1;
        overallPercentSum += pct;
        gradedCount += 1;
      }

      courseEntry.items.push({
        assignmentId: row.assignment_id,
        title: row.assignment_title,
        dueDate: row.due_date,
        maxScore,
        submissionId: hasSubmission ? row.submission_id : null,
        status: hasSubmission ? row.submission_status : 'not_submitted',
        score,
        feedback: row.feedback ?? null,
        submittedAt: row.submitted_at ?? null,
        gradedAt: row.graded_at ?? null
      });
    }
  }

  const courses = Array.from(courseMap.values()).map((entry) => {
    const courseAveragePercent =
      entry._gradedCount > 0
        ? roundPercent(entry._percentSum / entry._gradedCount)
        : null;

    return {
      courseId: entry.courseId,
      courseCode: entry.courseCode,
      courseTitle: entry.courseTitle,
      instructorName: entry.instructorName,
      enrollmentStatus: entry.enrollmentStatus,
      courseAveragePercent,
      items: entry.items
    };
  });

  return {
    summary: {
      enrolledCoursesCount: courses.length,
      totalAssignments,
      submittedCount,
      gradedCount,
      averagePercent:
        gradedCount > 0 ? roundPercent(overallPercentSum / gradedCount) : null
    },
    courses
  };
}

export async function getDashboardSummary(db, user) {
  if (user.role === 'student') {
    const records = await getStudentLearningRecords(db, user.id);

    const [upcomingRows] = await db.execute(
      `SELECT
         a.id AS assignment_id,
         a.title,
         a.due_date,
         a.max_score,
         c.id AS course_id,
         c.course_code,
         c.title AS course_title
       FROM enrollments AS e
       INNER JOIN courses AS c ON c.id = e.course_id
       INNER JOIN assignments AS a ON a.course_id = c.id
       LEFT JOIN submissions AS s ON s.assignment_id = a.id AND s.student_id = e.student_id
       WHERE e.student_id = ?
         AND e.status IN ('active', 'completed')
         AND s.id IS NULL
       ORDER BY a.due_date ASC, a.id ASC
       LIMIT 5`,
      [user.id]
    );

    const [recentGradeRows] = await db.execute(
      `SELECT
         s.id AS submission_id,
         a.id AS assignment_id,
         a.title AS assignment_title,
         a.max_score,
         c.id AS course_id,
         c.course_code,
         s.score,
         s.feedback,
         s.status,
         s.graded_at
       FROM submissions AS s
       INNER JOIN assignments AS a ON a.id = s.assignment_id
       INNER JOIN courses AS c ON c.id = a.course_id
       WHERE s.student_id = ?
         AND s.status IN ('graded', 'returned')
         AND s.score IS NOT NULL
       ORDER BY s.graded_at DESC, s.id DESC
       LIMIT 5`,
      [user.id]
    );

    const pendingAssignments =
      records.summary.totalAssignments - records.summary.submittedCount;

    return {
      role: 'student',
      kpis: {
        enrolledCourses: records.summary.enrolledCoursesCount,
        pendingAssignments,
        averagePercent: records.summary.averagePercent
      },
      upcomingAssignments: upcomingRows.map((row) => ({
        assignmentId: row.assignment_id,
        title: row.title,
        dueDate: row.due_date,
        maxScore: Number(row.max_score),
        courseId: row.course_id,
        courseCode: row.course_code,
        courseTitle: row.course_title
      })),
      recentGrades: recentGradeRows.map((row) => ({
        submissionId: row.submission_id,
        assignmentId: row.assignment_id,
        assignmentTitle: row.assignment_title,
        maxScore: Number(row.max_score),
        courseId: row.course_id,
        courseCode: row.course_code,
        score: Number(row.score),
        feedback: row.feedback ?? null,
        status: row.status,
        gradedAt: row.graded_at
      }))
    };
  }

  if (user.role === 'instructor') {
    const [courseRows] = await db.execute(
      `SELECT
         c.id,
         c.course_code,
         c.title,
         c.term,
         COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) AS active_student_count
       FROM courses AS c
       LEFT JOIN enrollments AS e ON e.course_id = c.id
       WHERE c.instructor_id = ?
       GROUP BY c.id, c.course_code, c.title, c.term
       ORDER BY c.course_code ASC`,
      [user.id]
    );

    const [kpiRows] = await db.execute(
      `SELECT
         COUNT(DISTINCT CASE WHEN s.status = 'submitted' THEN s.id END) AS pending_to_grade,
         COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) AS total_students
       FROM courses AS c
       LEFT JOIN enrollments AS e ON e.course_id = c.id
       LEFT JOIN assignments AS a ON a.course_id = c.id
       LEFT JOIN submissions AS s ON s.assignment_id = a.id
       WHERE c.instructor_id = ?`,
      [user.id]
    );

    const [recentSubRows] = await db.execute(
      `SELECT
         s.id AS submission_id,
         a.id AS assignment_id,
         a.title AS assignment_title,
         c.id AS course_id,
         c.course_code,
         u.id AS student_id,
         u.full_name AS student_name,
         s.file_name,
         s.status,
         s.submitted_at
       FROM submissions AS s
       INNER JOIN assignments AS a ON a.id = s.assignment_id
       INNER JOIN courses AS c ON c.id = a.course_id
       INNER JOIN users AS u ON u.id = s.student_id
       WHERE c.instructor_id = ?
       ORDER BY s.submitted_at DESC, s.id DESC
       LIMIT 5`,
      [user.id]
    );

    const stats = kpiRows?.[0] || {};
    return {
      role: 'instructor',
      kpis: {
        assignedCourses: courseRows.length,
        pendingToGrade: Number(stats.pending_to_grade ?? 0),
        totalStudents: Number(stats.total_students ?? 0)
      },
      recentSubmissions: recentSubRows.map((row) => ({
        submissionId: row.submission_id,
        assignmentId: row.assignment_id,
        assignmentTitle: row.assignment_title,
        courseId: row.course_id,
        courseCode: row.course_code,
        studentId: row.student_id,
        studentName: row.student_name,
        fileName: row.file_name,
        status: row.status,
        submittedAt: row.submitted_at
      })),
      courses: courseRows.map((row) => ({
        id: row.id,
        courseCode: row.course_code,
        title: row.title,
        term: row.term,
        activeStudentCount: Number(row.active_student_count ?? 0)
      }))
    };
  }

  // admin
  const [countsRows] = await db.execute(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM courses) AS total_courses,
       (SELECT COUNT(*) FROM enrollments WHERE status = 'active') AS total_enrollments`,
    []
  );
  const [recentUserRows] = await db.execute(
    'SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC, id DESC LIMIT 5',
    []
  );
  const [recentCourseRows] = await db.execute(
    `SELECT
       c.id,
       c.course_code,
       c.title,
       c.term,
       u.full_name AS instructor_name,
       c.created_at
     FROM courses AS c
     INNER JOIN users AS u ON u.id = c.instructor_id
     ORDER BY c.created_at DESC, c.id DESC
     LIMIT 5`,
    []
  );

  const counts = countsRows?.[0] || {};
  return {
    role: 'admin',
    kpis: {
      totalUsers: Number(counts.total_users ?? 0),
      totalCourses: Number(counts.total_courses ?? 0),
      totalEnrollments: Number(counts.total_enrollments ?? 0)
    },
    recentUsers: recentUserRows.map(mapUserRow),
    recentCourses: recentCourseRows.map((row) => ({
      id: row.id,
      courseCode: row.course_code,
      title: row.title,
      term: row.term,
      instructorName: row.instructor_name,
      createdAt: row.created_at
    }))
  };
}
