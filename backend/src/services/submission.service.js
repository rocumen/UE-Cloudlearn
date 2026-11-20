import { AppError } from '../utils/response.js';
import { findAssignmentById } from './assignment.service.js';
import { requireCourseWriteAccess } from './course.service.js';

function mapSubmissionRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    assignmentId: row.assignment_id,
    ...(row.assignment_title !== undefined
      ? { assignmentTitle: row.assignment_title }
      : {}),
    ...(row.max_score !== undefined
      ? { maxScore: Number(row.max_score) }
      : {}),
    ...(row.course_id !== undefined ? { courseId: row.course_id } : {}),
    ...(row.course_code !== undefined ? { courseCode: row.course_code } : {}),
    ...(row.course_title !== undefined
      ? { courseTitle: row.course_title }
      : {}),
    studentId: row.student_id,
    ...(row.student_name !== undefined
      ? { studentName: row.student_name }
      : {}),
    ...(row.student_email !== undefined
      ? { studentEmail: row.student_email }
      : {}),
    fileName: row.file_name,
    s3Key: row.s3_key,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    studentNote: row.student_note ?? null,
    score: row.score !== null && row.score !== undefined ? Number(row.score) : null,
    feedback: row.feedback ?? null,
    status: row.status,
    submittedAt: row.submitted_at,
    gradedAt: row.graded_at ?? null,
    updatedAt: row.updated_at
  };
}

export async function findSubmissionContextById(db, submissionId) {
  const [rows] = await db.execute(
    `SELECT
       s.id,
       s.assignment_id,
       s.student_id,
       s.file_name,
       s.s3_key,
       s.mime_type,
       s.file_size,
       s.student_note,
       s.score,
       s.feedback,
       s.status,
       s.submitted_at,
       s.graded_at,
       s.updated_at,
       a.title AS assignment_title,
       a.max_score,
       a.course_id,
       c.course_code,
       c.title AS course_title,
       c.instructor_id,
       u.full_name AS student_name,
       u.email AS student_email
     FROM submissions AS s
     INNER JOIN assignments AS a ON a.id = s.assignment_id
     INNER JOIN courses AS c ON c.id = a.course_id
     INNER JOIN users AS u ON u.id = s.student_id
     WHERE s.id = ?
     LIMIT 1`,
    [submissionId]
  );
  return rows?.[0] || null;
}

export async function listSubmissionsForStaff(db, user, { status, courseId } = {}) {
  const conditions = [];
  const params = [];

  if (user.role === 'instructor') {
    conditions.push('c.instructor_id = ?');
    params.push(user.id);
  }

  if (status) {
    conditions.push('s.status = ?');
    params.push(status);
  }

  if (courseId) {
    conditions.push('c.id = ?');
    params.push(courseId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await db.execute(
    `SELECT
       s.id,
       s.assignment_id,
       a.title AS assignment_title,
       a.max_score,
       c.id AS course_id,
       c.course_code,
       c.title AS course_title,
       s.student_id,
       u.full_name AS student_name,
       u.email AS student_email,
       s.file_name,
       s.s3_key,
       s.mime_type,
       s.file_size,
       s.student_note,
       s.score,
       s.feedback,
       s.status,
       s.submitted_at,
       s.graded_at,
       s.updated_at
     FROM submissions AS s
     INNER JOIN assignments AS a ON a.id = s.assignment_id
     INNER JOIN courses AS c ON c.id = a.course_id
     INNER JOIN users AS u ON u.id = s.student_id
     ${whereClause}
     ORDER BY s.submitted_at DESC, s.id DESC`,
    params
  );

  return rows.map(mapSubmissionRow);
}

export async function listSubmissionsForAssignment(db, assignmentId, user) {
  const assignment = await findAssignmentById(db, assignmentId);
  if (!assignment) {
    throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.');
  }

  await requireCourseWriteAccess(db, assignment.course_id, user);

  const [rows] = await db.execute(
    `SELECT
       s.id,
       s.assignment_id,
       s.student_id,
       u.full_name AS student_name,
       u.email AS student_email,
       s.file_name,
       s.s3_key,
       s.mime_type,
       s.file_size,
       s.student_note,
       s.score,
       s.feedback,
       s.status,
       s.submitted_at,
       s.graded_at,
       s.updated_at
     FROM submissions AS s
     INNER JOIN users AS u ON u.id = s.student_id
     WHERE s.assignment_id = ?
     ORDER BY s.submitted_at DESC, s.id DESC`,
    [assignmentId]
  );

  return rows.map(mapSubmissionRow);
}

export async function verifyStudentCanSubmit(db, assignmentId, studentId) {
  const assignment = await findAssignmentById(db, assignmentId);
  if (!assignment) {
    throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.');
  }

  const [enrollments] = await db.execute(
    "SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = 'active' LIMIT 1",
    [studentId, assignment.course_id]
  );
  if (!enrollments?.[0]) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You must have an active enrollment in this course to submit assignments.'
    );
  }

  const [existingRows] = await db.execute(
    'SELECT id, s3_key, status FROM submissions WHERE assignment_id = ? AND student_id = ? LIMIT 1',
    [assignmentId, studentId]
  );
  const existing = existingRows?.[0] || null;

  if (existing && existing.status === 'graded') {
    throw new AppError(
      409,
      'ALREADY_GRADED',
      'This assignment has already been graded and cannot be replaced.'
    );
  }

  return { assignment, existing };
}

export async function upsertSubmissionRecord(
  db,
  { existingId, assignmentId, studentId, fileName, s3Key, mimeType, fileSize, studentNote = null }
) {
  if (existingId) {
    await db.execute(
      `UPDATE submissions
       SET file_name = ?, s3_key = ?, mime_type = ?, file_size = ?, student_note = ?, status = 'submitted', submitted_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [fileName, s3Key, mimeType, fileSize, studentNote, existingId]
    );
    const updated = await findSubmissionContextById(db, existingId);
    return { submission: mapSubmissionRow(updated), replaced: true };
  }

  const [result] = await db.execute(
    `INSERT INTO submissions
       (assignment_id, student_id, file_name, s3_key, mime_type, file_size, student_note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`,
    [assignmentId, studentId, fileName, s3Key, mimeType, fileSize, studentNote]
  );
  const created = await findSubmissionContextById(db, result.insertId);
  return { submission: mapSubmissionRow(created), replaced: false };
}

export async function deleteSubmissionRecord(db, submissionId) {
  const [result] = await db.execute('DELETE FROM submissions WHERE id = ?', [
    submissionId
  ]);
  return Boolean(result && result.affectedRows > 0);
}

export async function gradeSubmissionRecord(
  db,
  submissionId,
  { score, feedback = null, status = 'graded' }
) {
  await db.execute(
    'UPDATE submissions SET score = ?, feedback = ?, status = ?, graded_at = NOW() WHERE id = ?',
    [score, feedback, status, submissionId]
  );
  const updated = await findSubmissionContextById(db, submissionId);
  return mapSubmissionRow(updated);
}
