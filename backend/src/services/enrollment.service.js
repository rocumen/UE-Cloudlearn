import { AppError } from '../utils/response.js';
import { findRawCourseById, requireCourseWriteAccess } from './course.service.js';

function mapEnrollmentRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    studentId: row.student_id,
    courseId: row.course_id,
    status: row.status,
    enrolledAt: row.enrolled_at
  };
}

export async function enrollStudentInCourse(db, courseId, studentId) {
  const course = await findRawCourseById(db, courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
  }

  const [existingRows] = await db.execute(
    'SELECT id, student_id, course_id, status, enrolled_at FROM enrollments WHERE student_id = ? AND course_id = ? LIMIT 1',
    [studentId, courseId]
  );
  const existing = existingRows?.[0];

  if (existing) {
    if (existing.status === 'active' || existing.status === 'completed') {
      throw new AppError(
        409,
        'ALREADY_ENROLLED',
        'You are already enrolled in this course.'
      );
    }

    await db.execute(
      "UPDATE enrollments SET status = 'active', enrolled_at = CURRENT_TIMESTAMP WHERE id = ?",
      [existing.id]
    );
    const [reactivatedRows] = await db.execute(
      'SELECT id, student_id, course_id, status, enrolled_at FROM enrollments WHERE id = ? LIMIT 1',
      [existing.id]
    );
    return mapEnrollmentRow(reactivatedRows[0]);
  }

  const [result] = await db.execute(
    "INSERT INTO enrollments (student_id, course_id, status) VALUES (?, ?, 'active')",
    [studentId, courseId]
  );
  const [createdRows] = await db.execute(
    'SELECT id, student_id, course_id, status, enrolled_at FROM enrollments WHERE id = ? LIMIT 1',
    [result.insertId]
  );
  return mapEnrollmentRow(createdRows[0]);
}

export async function unenrollStudentFromCourse(db, courseId, studentId) {
  const course = await findRawCourseById(db, courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
  }

  const [result] = await db.execute(
    'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
    [studentId, courseId]
  );

  if (!result || result.affectedRows === 0) {
    throw new AppError(
      404,
      'ENROLLMENT_NOT_FOUND',
      'Enrollment record not found.'
    );
  }

  return true;
}

export async function listEnrolledStudentsForCourse(db, courseId, user) {
  await requireCourseWriteAccess(db, courseId, user);

  const [rows] = await db.execute(
    `SELECT
       e.id AS enrollment_id,
       u.id AS student_id,
       u.full_name,
       u.email,
       e.status,
       e.enrolled_at
     FROM enrollments AS e
     INNER JOIN users AS u ON u.id = e.student_id
     WHERE e.course_id = ?
     ORDER BY u.full_name ASC`,
    [courseId]
  );

  return rows.map((row) => ({
    enrollmentId: row.enrollment_id,
    studentId: row.student_id,
    fullName: row.full_name,
    email: row.email,
    status: row.status,
    enrolledAt: row.enrolled_at
  }));
}
