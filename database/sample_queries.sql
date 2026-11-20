-- ============================================================================
-- UE Cloudlearn — Sample SQL Operations (Chapter 4.4 Evidence Script)
-- ============================================================================
-- Course:      CCS_4301 / CS1G — Cloud Computing (First Semester 2026-2027)
-- Target DB:   ue_cloudlearn (Amazon RDS for MySQL 8.0)
-- Sections:    1. Schema Inspection (CREATE / DESCRIBE)
--              2. INSERT Examples
--              3. SELECT Examples
--              4. UPDATE Examples
--              5. DELETE Examples (Safe, targeted single-record filters)
--              6. Multi-Table JOIN & Aggregate Queries
-- ============================================================================

USE ue_cloudlearn;

-- ----------------------------------------------------------------------------
-- Section 1: CREATE / Schema Inspection
-- ----------------------------------------------------------------------------
SHOW TABLES;

DESCRIBE courses;

SHOW CREATE TABLE submissions;

-- ----------------------------------------------------------------------------
-- Section 2: INSERT Examples
-- ----------------------------------------------------------------------------
-- 2a. Register a new student account (use bcryptjs hash from backend in prod)
INSERT IGNORE INTO users (full_name, email, password_hash, role, status)
VALUES (
    'Sofia Villanueva',
    'student.villanueva.demo@ue-cloudlearn.edu.ph',
    'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT',
    'student',
    'active'
);

-- 2b. Enroll the newly registered student in CCS4301 (course id = 1)
INSERT IGNORE INTO enrollments (student_id, course_id, status)
SELECT u.id, 1, 'active'
FROM users AS u
WHERE u.email = 'student.villanueva.demo@ue-cloudlearn.edu.ph';

-- 2c. Upload a new course learning material metadata row (S3 key is unique)
INSERT IGNORE INTO materials (
    course_id, uploaded_by, title, description, file_name, s3_key, mime_type, file_size
) VALUES (
    1,
    2,
    'Week 5: Amazon RDS MySQL Parameterized Queries',
    'Supplemental SQL handout demonstrating safe mysql2/promise placeholders.',
    'week-05-rds-sql-guide.pdf',
    'materials/course-1/demo-week-05-rds-sql-guide.pdf',
    'application/pdf',
    612400
);

-- 2d. Submit or replace a student assignment submission (idempotent upsert)
INSERT INTO submissions (
    assignment_id, student_id, file_name, s3_key, mime_type, file_size, student_note, status
) VALUES (
    4,
    4,
    'cruz-crud-endpoints.zip',
    'submissions/assignment-4/student-4/demo-cruz-crud-endpoints.zip',
    'application/zip',
    1048576,
    'Includes routes, parameterized SQL services, and API tests.',
    'submitted'
)
ON DUPLICATE KEY UPDATE
    file_name    = VALUES(file_name),
    s3_key       = VALUES(s3_key),
    mime_type    = VALUES(mime_type),
    file_size    = VALUES(file_size),
    student_note = VALUES(student_note),
    status       = 'submitted',
    submitted_at = CURRENT_TIMESTAMP;

-- ----------------------------------------------------------------------------
-- Section 3: SELECT Examples
-- ----------------------------------------------------------------------------
-- 3a. List all courses ordered by course code
SELECT id, course_code, title, term, instructor_id, created_at
FROM courses
ORDER BY course_code ASC;

-- 3b. List learning materials for course 1 ordered newest first
SELECT id, title, file_name, mime_type, file_size, created_at
FROM materials
WHERE course_id = 1
ORDER BY created_at DESC;

-- 3c. List pending ungraded submissions across all assignments
SELECT s.id, s.assignment_id, s.student_id, s.file_name, s.status, s.submitted_at
FROM submissions AS s
WHERE s.status = 'submitted'
ORDER BY s.submitted_at ASC;

-- ----------------------------------------------------------------------------
-- Section 4: UPDATE Examples
-- ----------------------------------------------------------------------------
-- 4a. Update a course syllabus description
UPDATE courses
SET description = 'Covers AWS VPC networking, IAM least-privilege roles, EC2 + Nginx/PM2 hosting, private RDS MySQL, and S3 presigned URLs.'
WHERE course_code = 'CCS4301';

-- 4b. Grade a pending student submission (sets score, feedback, status, graded_at)
UPDATE submissions
SET
    score     = 92.50,
    feedback  = 'Clear IAM policy least-privilege scope and verified 5-minute presigned URL behavior.',
    status    = 'graded',
    graded_at = NOW()
WHERE assignment_id = 2
  AND student_id    = 4
  AND status        = 'submitted';

-- ----------------------------------------------------------------------------
-- Section 5: DELETE Examples (Safe single-record WHERE filters)
-- ----------------------------------------------------------------------------
-- Note: Targeted WHERE conditions ensure only specific demo/ungraded records
-- are deleted. Wrapped cleanly for demonstration; review IDs before running.

-- 5a. Remove an ungraded submission (matches student/owner delete guard)
DELETE FROM submissions
WHERE assignment_id = 4
  AND student_id    = 4
  AND status        = 'submitted';

-- 5b. Drop a specific enrollment for the demo student added in Section 2a/2b
DELETE e
FROM enrollments AS e
INNER JOIN users AS u ON u.id = e.student_id
WHERE u.email     = 'student.villanueva.demo@ue-cloudlearn.edu.ph'
  AND e.course_id = 1;

-- ----------------------------------------------------------------------------
-- Section 6: Multi-Table JOIN & Aggregate Queries
-- ----------------------------------------------------------------------------
-- 6a. Course Catalog with Instructor Full Name and Active Enrollment Count
SELECT
    c.id,
    c.course_code,
    c.title,
    c.term,
    u.full_name AS instructor_name,
    COUNT(CASE WHEN e.status = 'active' THEN 1 END) AS active_student_count
FROM courses AS c
INNER JOIN users AS u
    ON u.id = c.instructor_id
LEFT JOIN enrollments AS e
    ON e.course_id = c.id
GROUP BY c.id, c.course_code, c.title, c.term, u.full_name
ORDER BY c.course_code ASC;

-- 6b. Student Learning Records (Consolidated courses, assignments, scores, feedback)
SELECT
    c.course_code,
    c.title        AS course_title,
    e.status       AS enrollment_status,
    a.id           AS assignment_id,
    a.title        AS assignment_title,
    a.due_date,
    a.max_score,
    s.id           AS submission_id,
    COALESCE(s.status, 'not_submitted') AS submission_status,
    s.score,
    s.feedback,
    s.submitted_at,
    s.graded_at
FROM enrollments AS e
INNER JOIN courses AS c
    ON c.id = e.course_id
INNER JOIN assignments AS a
    ON a.course_id = c.id
LEFT JOIN submissions AS s
    ON s.assignment_id = a.id
   AND s.student_id    = e.student_id
WHERE e.student_id = 4
  AND e.status IN ('active', 'completed')
ORDER BY c.course_code ASC, a.due_date ASC;

-- 6c. Instructor Gradebook for a Specific Assignment
SELECT
    c.course_code,
    a.title       AS assignment_title,
    a.max_score,
    u.id          AS student_id,
    u.full_name   AS student_name,
    u.email       AS student_email,
    s.id          AS submission_id,
    s.file_name,
    s.status      AS submission_status,
    s.score,
    s.feedback,
    s.submitted_at,
    s.graded_at
FROM submissions AS s
INNER JOIN users AS u
    ON u.id = s.student_id
INNER JOIN assignments AS a
    ON a.id = s.assignment_id
INNER JOIN courses AS c
    ON c.id = a.course_id
WHERE s.assignment_id = 1
ORDER BY u.full_name ASC;
