-- ============================================================================
-- UE Cloudlearn — Seed Data Script (Amazon RDS for MySQL 8.0)
-- ============================================================================
-- Course:      CCS_4301 / CS1G — Cloud Computing (First Semester 2026-2027)
-- Institution: University of the East — Caloocan, College of Engineering
-- Notes:       Idempotent DML using INSERT IGNORE INTO with explicit primary
--              keys so repeated execution does not duplicate rows or fail.
--              All persona names below are fictional academic sample accounts.
-- ============================================================================

USE ue_cloudlearn;

-- ----------------------------------------------------------------------------
-- 1. Users (1 Admin, 2 Instructors, 3 Students)
-- ----------------------------------------------------------------------------
-- PASSWORD HASH NOTICE:
-- These rows use an explicit non-login placeholder string in password_hash.
-- Run backend/src/scripts/seed-passwords.js with SEED_DEMO_PASSWORD to
-- populate valid bcryptjs hashes before login. Never store plaintext passwords.
INSERT IGNORE INTO users (id, full_name, email, password_hash, role, status) VALUES
    (1, 'Elena Navarro',        'admin@ue-cloudlearn.edu.ph',             'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT', 'admin',      'active'),
    (2, 'Prof. Marco Santos',   'instructor.santos@ue-cloudlearn.edu.ph', 'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT', 'instructor', 'active'),
    (3, 'Prof. Clarissa Reyes', 'instructor.reyes@ue-cloudlearn.edu.ph',  'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT', 'instructor', 'active'),
    (4, 'Gabriel Cruz',         'student.cruz@ue-cloudlearn.edu.ph',      'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT', 'student',    'active'),
    (5, 'Andrea Torres',        'student.torres@ue-cloudlearn.edu.ph',    'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT', 'student',    'active'),
    (6, 'Paolo Mendoza',        'student.mendoza@ue-cloudlearn.edu.ph',   'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT', 'student',    'active');

-- ----------------------------------------------------------------------------
-- 2. Courses (First Semester 2026-2027)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO courses (id, course_code, title, description, term, instructor_id) VALUES
    (
        1,
        'CCS4301',
        'Cloud Computing',
        'Covers AWS cloud architecture, Amazon VPC networking, IAM least-privilege policies, EC2 hosting, RDS MySQL, and S3 object storage.',
        'First Semester 2026-2027',
        2
    ),
    (
        2,
        'CCS3102',
        'Database Management Systems',
        'Relational data modeling, normalization (1NF-3NF), SQL DDL/DML, indexing, transactions, and managed relational cloud databases.',
        'First Semester 2026-2027',
        3
    ),
    (
        3,
        'CCS3204',
        'Web Systems and Technologies',
        'Full-stack web application design using RESTful APIs, Express.js, React, authentication, and secure reverse-proxy deployment.',
        'First Semester 2026-2027',
        2
    );

-- ----------------------------------------------------------------------------
-- 3. Enrollments (7 records across 3 students and 3 courses)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO enrollments (id, student_id, course_id, status, enrolled_at) VALUES
    (1, 4, 1, 'active',    '2026-08-18 09:00:00'),
    (2, 4, 2, 'active',    '2026-08-18 09:05:00'),
    (3, 4, 3, 'active',    '2026-08-18 09:10:00'),
    (4, 5, 1, 'active',    '2026-08-19 10:15:00'),
    (5, 5, 3, 'active',    '2026-08-19 10:20:00'),
    (6, 6, 1, 'active',    '2026-08-20 13:30:00'),
    (7, 6, 2, 'completed', '2026-08-20 13:35:00');

-- ----------------------------------------------------------------------------
-- 4. Learning Materials (4 sample metadata records)
-- ----------------------------------------------------------------------------
-- S3 OBJECT NOTICE:
-- These s3_key values follow the production key convention and serve as sample
-- metadata records until corresponding objects are uploaded to Amazon S3 via
-- the authenticated instructor upload endpoint.
INSERT IGNORE INTO materials (id, course_id, uploaded_by, title, description, file_name, s3_key, mime_type, file_size) VALUES
    (
        1,
        1,
        2,
        'Week 1: Cloud Computing Fundamentals & AWS Overview',
        'Lecture slides introducing IaaS, PaaS, SaaS, AWS Global Infrastructure, and the Shared Responsibility Model.',
        'week-01-cloud-fundamentals.pdf',
        'materials/course-1/11111111-1111-4111-8111-111111111101-week-01-cloud-fundamentals.pdf',
        'application/pdf',
        1845230
    ),
    (
        2,
        1,
        2,
        'Week 3: Amazon VPC, Subnets & Security Groups',
        'Reference deck covering CIDR planning, public vs. private subnets, Internet Gateways, and stateful security groups.',
        'week-03-vpc-networking.pptx',
        'materials/course-1/11111111-1111-4111-8111-111111111102-week-03-vpc-networking.pptx',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        3420160
    ),
    (
        3,
        2,
        3,
        'Module 2: Relational Normalization (1NF to 3NF) & ERD',
        'Worked normalization examples and foreign-key integrity guidelines for MySQL 8.0 InnoDB schemas.',
        'module-02-normalization-erd.pdf',
        'materials/course-2/22222222-2222-4222-8222-222222222201-module-02-normalization-erd.pdf',
        'application/pdf',
        1290440
    ),
    (
        4,
        3,
        2,
        'Lab Guide: RESTful API Design with Express.js',
        'Step-by-step handout on Express routing, input validation, parameterized queries, and JWT cookie sessions.',
        'lab-01-express-rest-api.pdf',
        'materials/course-3/33333333-3333-4333-8333-333333333301-lab-01-express-rest-api.pdf',
        'application/pdf',
        954880
    );

-- ----------------------------------------------------------------------------
-- 5. Assignments (4 records across courses, including optional attachments)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO assignments (
    id, course_id, created_by, title, instructions, due_date, max_score,
    attachment_file_name, attachment_s3_key
) VALUES
    (
        1,
        1,
        2,
        'Lab 1: AWS VPC & Security Group Architecture Diagram',
        'Design a custom VPC with one public subnet for EC2 and two private subnets for RDS MySQL. Export your diagram and CIDR table as a PDF.',
        '2026-09-25 23:59:00',
        100,
        'lab-01-vpc-rubric.pdf',
        'assignments/course-1/44444444-4444-4444-8444-444444444401-lab-01-vpc-rubric.pdf'
    ),
    (
        2,
        1,
        2,
        'Lab 2: Amazon S3 Private Bucket & IAM Policy Setup',
        'Document least-privilege IAM policy rules for an EC2 Instance Profile accessing a private S3 bucket using presigned GET URLs.',
        '2026-10-16 23:59:00',
        100,
        NULL,
        NULL
    ),
    (
        3,
        2,
        3,
        'Case Study: 3NF Relational Schema for Campus LMS',
        'Normalize the provided unnormalized course-record sheet into 3NF and submit an ERD with MySQL 8.0 CREATE TABLE scripts.',
        '2026-10-02 23:59:00',
        50,
        'case-study-erd-template.docx',
        'assignments/course-2/44444444-4444-4444-8444-444444444402-case-study-erd-template.docx'
    ),
    (
        4,
        3,
        2,
        'Mini-Project: Parameterized MySQL CRUD Endpoints',
        'Implement Express REST endpoints using mysql2/promise placeholders (?) and submit your endpoint verification summary.',
        '2026-10-23 23:59:00',
        100,
        NULL,
        NULL
    );

-- ----------------------------------------------------------------------------
-- 6. Submissions (4 records covering 'graded' and 'submitted' states)
-- ----------------------------------------------------------------------------
INSERT IGNORE INTO submissions (
    id, assignment_id, student_id, file_name, s3_key, mime_type, file_size,
    student_note, score, feedback, status, submitted_at, graded_at
) VALUES
    (
        1,
        1,
        4,
        'cruz-vpc-architecture.pdf',
        'submissions/assignment-1/student-4/55555555-5555-4555-8555-555555555501-cruz-vpc-architecture.pdf',
        'application/pdf',
        742110,
        'Included public/private route tables and ec2-sg -> rds-sg port 3306 rule.',
        95.00,
        'Well-structured CIDR layout and accurate security group referencing.',
        'graded',
        '2026-09-24 18:40:00',
        '2026-09-27 14:20:00'
    ),
    (
        2,
        1,
        5,
        'torres-vpc-diagram.pdf',
        'submissions/assignment-1/student-5/55555555-5555-4555-8555-555555555502-torres-vpc-diagram.pdf',
        'application/pdf',
        689340,
        'Submitted VPC topology with two private subnets across AZs.',
        89.50,
        'Good multi-AZ RDS subnet coverage; label the route table associations clearly next time.',
        'graded',
        '2026-09-25 20:10:00',
        '2026-09-27 15:05:00'
    ),
    (
        3,
        2,
        4,
        'cruz-s3-iam-report.pdf',
        'submissions/assignment-2/student-4/55555555-5555-4555-8555-555555555503-cruz-s3-iam-report.pdf',
        'application/pdf',
        518900,
        'Attached IAM JSON policy and presigned URL expiry test notes.',
        NULL,
        NULL,
        'submitted',
        '2026-10-15 21:12:00',
        NULL
    ),
    (
        4,
        3,
        6,
        'mendoza-3nf-schema.docx',
        'submissions/assignment-3/student-6/55555555-5555-4555-8555-555555555504-mendoza-3nf-schema.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        412650,
        'Completed 1NF, 2NF, 3NF breakdown and InnoDB DDL.',
        47.00,
        'Clean composite unique key design on enrollments and submissions.',
        'graded',
        '2026-10-01 16:45:00',
        '2026-10-04 10:15:00'
    );
