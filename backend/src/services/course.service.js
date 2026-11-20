import { AppError } from '../utils/response.js';

function mapCourseSummaryRow(row) {
  if (!row) return null;

  const enrollmentStatus = row.my_enrollment_status ?? null;
  return {
    id: row.id,
    courseCode: row.course_code,
    title: row.title,
    description: row.description ?? null,
    term: row.term,
    instructorId: row.instructor_id,
    instructorName: row.instructor_name ?? null,
    activeStudentCount: Number(row.active_student_count ?? 0),
    isEnrolled:
      enrollmentStatus === 'active' || enrollmentStatus === 'completed',
    enrollmentStatus,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null
  };
}

function mapCourseDetailRow(row) {
  if (!row) return null;

  const base = mapCourseSummaryRow(row);
  return {
    ...base,
    instructorEmail: row.instructor_email ?? null,
    materialCount: Number(row.material_count ?? 0),
    assignmentCount: Number(row.assignment_count ?? 0)
  };
}

export async function findRawCourseById(db, courseId) {
  const [rows] = await db.execute(
    'SELECT id, course_code, title, description, term, instructor_id, created_at, updated_at FROM courses WHERE id = ? LIMIT 1',
    [courseId]
  );
  return rows?.[0] || null;
}

export async function requireCourseReadAccess(db, courseId, user) {
  const course = await findRawCourseById(db, courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
  }

  if (user.role === 'admin') {
    return course;
  }

  if (user.role === 'instructor' && course.instructor_id === user.id) {
    return course;
  }

  if (user.role === 'student') {
    const [enrollments] = await db.execute(
      "SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ? AND status IN ('active', 'completed') LIMIT 1",
      [user.id, courseId]
    );
    if (enrollments?.[0]) {
      return course;
    }
  }

  throw new AppError(
    403,
    'FORBIDDEN',
    'You do not have permission to access this course.'
  );
}

export async function requireCourseWriteAccess(db, courseId, user) {
  const course = await findRawCourseById(db, courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
  }

  if (
    user.role === 'admin' ||
    (user.role === 'instructor' && course.instructor_id === user.id)
  ) {
    return course;
  }

  throw new AppError(
    403,
    'FORBIDDEN',
    'You do not have permission to modify this course.'
  );
}

export async function assertActiveInstructor(db, instructorId) {
  const [rows] = await db.execute(
    "SELECT id FROM users WHERE id = ? AND role = 'instructor' AND status = 'active' LIMIT 1",
    [instructorId]
  );
  if (!rows?.[0]) {
    throw new AppError(
      400,
      'INVALID_INSTRUCTOR',
      'Assigned instructor must be an active user with the instructor role.'
    );
  }
}

export async function listCourses(db, { userId, search, scope = 'all' }) {
  const conditions = [];
  const params = [userId];

  if (search) {
    const escaped = search.replace(/[\\%_]/g, (m) => `\\${m}`);
    const like = `%${escaped}%`;
    conditions.push('(c.course_code LIKE ? OR c.title LIKE ?)');
    params.push(like, like);
  }

  if (scope === 'enrolled') {
    conditions.push("e_me.status IN ('active', 'completed')");
  } else if (scope === 'assigned') {
    conditions.push('c.instructor_id = ?');
    params.push(userId);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await db.execute(
    `SELECT
       c.id,
       c.course_code,
       c.title,
       c.description,
       c.term,
       c.instructor_id,
       u.full_name AS instructor_name,
       COUNT(DISTINCT CASE WHEN e_all.status = 'active' THEN e_all.id END) AS active_student_count,
       MAX(e_me.status) AS my_enrollment_status,
       c.created_at,
       c.updated_at
     FROM courses AS c
     INNER JOIN users AS u ON u.id = c.instructor_id
     LEFT JOIN enrollments AS e_all ON e_all.course_id = c.id
     LEFT JOIN enrollments AS e_me ON e_me.course_id = c.id AND e_me.student_id = ?
     ${whereClause}
     GROUP BY c.id, c.course_code, c.title, c.description, c.term, c.instructor_id, u.full_name, c.created_at, c.updated_at
     ORDER BY c.course_code ASC`,
    params
  );

  return rows.map(mapCourseSummaryRow);
}

export async function getCourseDetailById(db, courseId, userId) {
  const [rows] = await db.execute(
    `SELECT
       c.id,
       c.course_code,
       c.title,
       c.description,
       c.term,
       c.instructor_id,
       u.full_name AS instructor_name,
       u.email AS instructor_email,
       COUNT(DISTINCT CASE WHEN e_all.status = 'active' THEN e_all.id END) AS active_student_count,
       COUNT(DISTINCT m.id) AS material_count,
       COUNT(DISTINCT a.id) AS assignment_count,
       MAX(e_me.status) AS my_enrollment_status,
       c.created_at,
       c.updated_at
     FROM courses AS c
     INNER JOIN users AS u ON u.id = c.instructor_id
     LEFT JOIN enrollments AS e_all ON e_all.course_id = c.id
     LEFT JOIN enrollments AS e_me ON e_me.course_id = c.id AND e_me.student_id = ?
     LEFT JOIN materials AS m ON m.course_id = c.id
     LEFT JOIN assignments AS a ON a.course_id = c.id
     WHERE c.id = ?
     GROUP BY c.id, c.course_code, c.title, c.description, c.term, c.instructor_id, u.full_name, u.email, c.created_at, c.updated_at
     LIMIT 1`,
    [userId, courseId]
  );

  return mapCourseDetailRow(rows?.[0] || null);
}

export async function createCourse(
  db,
  { courseCode, title, description = null, term = 'First Semester 2026-2027', instructorId },
  actorUserId
) {
  await assertActiveInstructor(db, instructorId);

  const [existingCode] = await db.execute(
    'SELECT id FROM courses WHERE course_code = ? LIMIT 1',
    [courseCode]
  );
  if (existingCode?.[0]) {
    throw new AppError(
      409,
      'COURSE_CODE_EXISTS',
      'A course with that course code already exists.'
    );
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO courses (course_code, title, description, term, instructor_id) VALUES (?, ?, ?, ?, ?)',
      [courseCode, title, description, term, instructorId]
    );
    return await getCourseDetailById(db, result.insertId, actorUserId);
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      throw new AppError(
        409,
        'COURSE_CODE_EXISTS',
        'A course with that course code already exists.'
      );
    }
    throw err;
  }
}

const UPDATABLE_COURSE_COLUMNS = {
  courseCode: 'course_code',
  title: 'title',
  description: 'description',
  term: 'term',
  instructorId: 'instructor_id'
};

export async function updateCourseById(db, courseId, updates, actorUserId) {
  if (updates.instructorId !== undefined) {
    await assertActiveInstructor(db, updates.instructorId);
  }

  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_COURSE_COLUMNS)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    return getCourseDetailById(db, courseId, actorUserId);
  }

  params.push(courseId);

  try {
    const [result] = await db.execute(
      `UPDATE courses SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
    if (!result || result.affectedRows === 0) {
      return null;
    }
    return await getCourseDetailById(db, courseId, actorUserId);
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      throw new AppError(
        409,
        'COURSE_CODE_EXISTS',
        'A course with that course code already exists.'
      );
    }
    throw err;
  }
}

export async function collectCourseS3Keys(db, courseId) {
  const [materialRows] = await db.execute(
    'SELECT s3_key FROM materials WHERE course_id = ?',
    [courseId]
  );
  const [assignmentRows] = await db.execute(
    'SELECT attachment_s3_key FROM assignments WHERE course_id = ? AND attachment_s3_key IS NOT NULL',
    [courseId]
  );
  const [submissionRows] = await db.execute(
    'SELECT s.s3_key FROM submissions AS s INNER JOIN assignments AS a ON a.id = s.assignment_id WHERE a.course_id = ?',
    [courseId]
  );

  return [
    ...materialRows.map((r) => r.s3_key),
    ...assignmentRows.map((r) => r.attachment_s3_key),
    ...submissionRows.map((r) => r.s3_key)
  ].filter(Boolean);
}

export async function deleteCourseById(db, courseId) {
  const [result] = await db.execute('DELETE FROM courses WHERE id = ?', [
    courseId
  ]);
  return Boolean(result && result.affectedRows > 0);
}
