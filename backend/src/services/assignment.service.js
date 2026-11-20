import { AppError } from '../utils/response.js';
import {
  requireCourseReadAccess,
  requireCourseWriteAccess
} from './course.service.js';

function mapAssignmentRow(row, role) {
  if (!row) return null;

  const base = {
    id: row.id,
    courseId: row.course_id,
    createdBy: row.created_by,
    creatorName: row.creator_name ?? null,
    title: row.title,
    instructions: row.instructions,
    dueDate: row.due_date,
    maxScore: Number(row.max_score),
    attachmentFileName: row.attachment_file_name ?? null,
    attachmentS3Key: row.attachment_s3_key ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (role === 'student') {
    base.mySubmission = row.my_submission_id
      ? {
          id: row.my_submission_id,
          fileName: row.my_submission_file_name,
          status: row.my_submission_status,
          score: row.my_submission_score !== null ? Number(row.my_submission_score) : null,
          feedback: row.my_submission_feedback ?? null,
          submittedAt: row.my_submission_submitted_at,
          gradedAt: row.my_submission_graded_at ?? null
        }
      : null;
  } else if (role === 'instructor' || role === 'admin') {
    if (row.submission_count !== undefined) {
      base.submissionCount = Number(row.submission_count ?? 0);
      base.gradedCount = Number(row.graded_count ?? 0);
    }
  }

  return base;
}

export async function findAssignmentById(db, assignmentId) {
  const [rows] = await db.execute(
    `SELECT
       a.id,
       a.course_id,
       a.created_by,
       u.full_name AS creator_name,
       a.title,
       a.instructions,
       a.due_date,
       a.max_score,
       a.attachment_file_name,
       a.attachment_s3_key,
       a.created_at,
       a.updated_at
     FROM assignments AS a
     INNER JOIN users AS u ON u.id = a.created_by
     WHERE a.id = ?
     LIMIT 1`,
    [assignmentId]
  );
  return rows?.[0] || null;
}

export async function listAssignmentsForCourse(db, courseId, user) {
  await requireCourseReadAccess(db, courseId, user);

  if (user.role === 'student') {
    const [rows] = await db.execute(
      `SELECT
         a.id,
         a.course_id,
         a.created_by,
         u.full_name AS creator_name,
         a.title,
         a.instructions,
         a.due_date,
         a.max_score,
         a.attachment_file_name,
         a.attachment_s3_key,
         a.created_at,
         a.updated_at,
         s.id AS my_submission_id,
         s.file_name AS my_submission_file_name,
         s.status AS my_submission_status,
         s.score AS my_submission_score,
         s.feedback AS my_submission_feedback,
         s.submitted_at AS my_submission_submitted_at,
         s.graded_at AS my_submission_graded_at
       FROM assignments AS a
       INNER JOIN users AS u ON u.id = a.created_by
       LEFT JOIN submissions AS s
         ON s.assignment_id = a.id AND s.student_id = ?
       WHERE a.course_id = ?
       ORDER BY a.due_date ASC, a.id ASC`,
      [user.id, courseId]
    );
    return rows.map((row) => mapAssignmentRow(row, user.role));
  }

  const [rows] = await db.execute(
    `SELECT
       a.id,
       a.course_id,
       a.created_by,
       u.full_name AS creator_name,
       a.title,
       a.instructions,
       a.due_date,
       a.max_score,
       a.attachment_file_name,
       a.attachment_s3_key,
       a.created_at,
       a.updated_at,
       COUNT(s.id) AS submission_count,
       COUNT(CASE WHEN s.status = 'graded' THEN 1 END) AS graded_count
     FROM assignments AS a
     INNER JOIN users AS u ON u.id = a.created_by
     LEFT JOIN submissions AS s ON s.assignment_id = a.id
     WHERE a.course_id = ?
     GROUP BY a.id, a.course_id, a.created_by, u.full_name, a.title, a.instructions, a.due_date, a.max_score, a.attachment_file_name, a.attachment_s3_key, a.created_at, a.updated_at
     ORDER BY a.due_date ASC, a.id ASC`,
    [courseId]
  );

  return rows.map((row) => mapAssignmentRow(row, user.role));
}

export async function createAssignmentRecord(
  db,
  {
    courseId,
    createdBy,
    title,
    instructions,
    dueDate,
    maxScore = 100,
    attachmentFileName = null,
    attachmentS3Key = null
  }
) {
  const [result] = await db.execute(
    `INSERT INTO assignments
       (course_id, created_by, title, instructions, due_date, max_score, attachment_file_name, attachment_s3_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      courseId,
      createdBy,
      title,
      instructions,
      dueDate,
      maxScore,
      attachmentFileName,
      attachmentS3Key
    ]
  );

  const row = await findAssignmentById(db, result.insertId);
  return mapAssignmentRow(row, null);
}

const UPDATABLE_ASSIGNMENT_COLUMNS = {
  title: 'title',
  instructions: 'instructions',
  dueDate: 'due_date',
  maxScore: 'max_score',
  attachmentFileName: 'attachment_file_name',
  attachmentS3Key: 'attachment_s3_key'
};

export async function updateAssignmentRecord(db, assignmentId, updates) {
  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_ASSIGNMENT_COLUMNS)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    const existing = await findAssignmentById(db, assignmentId);
    return mapAssignmentRow(existing, null);
  }

  params.push(assignmentId);
  const [result] = await db.execute(
    `UPDATE assignments SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  if (!result || result.affectedRows === 0) {
    return null;
  }

  const updated = await findAssignmentById(db, assignmentId);
  return mapAssignmentRow(updated, null);
}

export async function collectAssignmentS3Keys(db, assignmentId) {
  const assignment = await findAssignmentById(db, assignmentId);
  if (!assignment) return [];

  const [submissionRows] = await db.execute(
    'SELECT s3_key FROM submissions WHERE assignment_id = ?',
    [assignmentId]
  );

  return [
    assignment.attachment_s3_key,
    ...submissionRows.map((r) => r.s3_key)
  ].filter(Boolean);
}

export async function deleteAssignmentRecord(db, assignmentId) {
  const [result] = await db.execute('DELETE FROM assignments WHERE id = ?', [
    assignmentId
  ]);
  return Boolean(result && result.affectedRows > 0);
}

export async function getAssignmentWithAccess(db, assignmentId, user, mode = 'read') {
  const row = await findAssignmentById(db, assignmentId);
  if (!row) {
    throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.');
  }

  if (mode === 'write') {
    await requireCourseWriteAccess(db, row.course_id, user);
  } else {
    await requireCourseReadAccess(db, row.course_id, user);
  }

  return row;
}
