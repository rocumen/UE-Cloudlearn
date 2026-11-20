-- ============================================================================
-- UE Cloudlearn — Relational Database Schema (Amazon RDS for MySQL 8.0)
-- ============================================================================
-- Course:      CCS_4301 / CS1G — Cloud Computing (First Semester 2026-2027)
-- Institution: University of the East — Caloocan, College of Engineering
-- Engine:      InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- Notes:       Idempotent DDL (safe re-execution; no destructive drop statements).
--              Tables are created in strict foreign-key dependency order.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS ue_cloudlearn
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ue_cloudlearn;

-- ----------------------------------------------------------------------------
-- 1. users — System accounts for Admins, Instructors, and Students
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT          NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(120) NOT NULL,
    email         VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin', 'instructor', 'student') NOT NULL DEFAULT 'student',
    status        ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. courses — Academic courses managed by Admin and assigned to Instructors
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
    id            INT          NOT NULL AUTO_INCREMENT,
    course_code   VARCHAR(30)  NOT NULL,
    title         VARCHAR(160) NOT NULL,
    description   TEXT         NULL,
    term          VARCHAR(60)  NOT NULL DEFAULT 'First Semester 2026-2027',
    instructor_id INT          NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_courses_code (course_code),
    INDEX idx_courses_instructor (instructor_id),
    CONSTRAINT fk_courses_instructor
        FOREIGN KEY (instructor_id) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. enrollments — Many-to-many junction between Students and Courses
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enrollments (
    id          INT       NOT NULL AUTO_INCREMENT,
    student_id  INT       NOT NULL,
    course_id   INT       NOT NULL,
    status      ENUM('active', 'completed', 'dropped') NOT NULL DEFAULT 'active',
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_enrollment (student_id, course_id),
    INDEX idx_enrollments_course (course_id),
    CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_enrollments_course
        FOREIGN KEY (course_id) REFERENCES courses (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. materials — Course learning handouts whose binary objects live in S3
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
    id          INT             NOT NULL AUTO_INCREMENT,
    course_id   INT             NOT NULL,
    uploaded_by INT             NOT NULL,
    title       VARCHAR(180)    NOT NULL,
    description TEXT            NULL,
    file_name   VARCHAR(255)    NOT NULL,
    s3_key      VARCHAR(512)    NOT NULL,
    mime_type   VARCHAR(120)    NOT NULL,
    file_size   BIGINT UNSIGNED NOT NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_materials_s3_key (s3_key),
    INDEX idx_materials_course (course_id),
    CONSTRAINT fk_materials_course
        FOREIGN KEY (course_id) REFERENCES courses (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_materials_uploader
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. assignments — Course assessments with optional S3 reference attachment
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assignments (
    id                   INT          NOT NULL AUTO_INCREMENT,
    course_id            INT          NOT NULL,
    created_by           INT          NOT NULL,
    title                VARCHAR(180) NOT NULL,
    instructions         TEXT         NOT NULL,
    due_date             DATETIME     NOT NULL,
    max_score            INT UNSIGNED NOT NULL DEFAULT 100,
    attachment_file_name VARCHAR(255) NULL,
    attachment_s3_key    VARCHAR(512) NULL,
    created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_assignments_attachment_s3_key (attachment_s3_key),
    INDEX idx_assignments_course_due (course_id, due_date),
    CONSTRAINT chk_assignments_max_score
        CHECK (max_score > 0),
    CONSTRAINT fk_assignments_course
        FOREIGN KEY (course_id) REFERENCES courses (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_assignments_creator
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. submissions — Student assignment submissions (1 active record per pair)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS submissions (
    id            INT             NOT NULL AUTO_INCREMENT,
    assignment_id INT             NOT NULL,
    student_id    INT             NOT NULL,
    file_name     VARCHAR(255)    NOT NULL,
    s3_key        VARCHAR(512)    NOT NULL,
    mime_type     VARCHAR(120)    NOT NULL,
    file_size     BIGINT UNSIGNED NOT NULL,
    student_note  TEXT            NULL,
    score         DECIMAL(6,2)    NULL,
    feedback      TEXT            NULL,
    status        ENUM('submitted', 'graded', 'returned') NOT NULL DEFAULT 'submitted',
    submitted_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    graded_at     TIMESTAMP       NULL,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_submission (assignment_id, student_id),
    UNIQUE KEY uq_submissions_s3_key (s3_key),
    INDEX idx_submissions_student (student_id),
    CONSTRAINT chk_submissions_score
        CHECK (score IS NULL OR score >= 0),
    CONSTRAINT fk_submissions_assignment
        FOREIGN KEY (assignment_id) REFERENCES assignments (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_submissions_student
        FOREIGN KEY (student_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
