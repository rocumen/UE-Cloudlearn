import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createMockDb } from './helpers/mockDb.js';
import { createMockStorage } from './helpers/mockStorage.js';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: '24h'
  });
}

async function buildFixture() {
  const hash = await bcrypt.hash('TestPass123!', 10);
  const db = createMockDb({
    users: [
      {
        id: 1,
        full_name: 'Elena Navarro',
        email: 'admin@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'admin',
        status: 'active'
      },
      {
        id: 2,
        full_name: 'Prof. Marco Santos',
        email: 'instructor.santos@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'instructor',
        status: 'active'
      },
      {
        id: 3,
        full_name: 'Prof. Clarissa Reyes',
        email: 'instructor.reyes@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'instructor',
        status: 'active'
      },
      {
        id: 4,
        full_name: 'Gabriel Cruz',
        email: 'student.cruz@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'student',
        status: 'active'
      },
      {
        id: 5,
        full_name: 'Andrea Torres',
        email: 'student.torres@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'student',
        status: 'active'
      }
    ],
    courses: [
      {
        id: 1,
        course_code: 'CCS4301',
        title: 'Cloud Computing',
        description: 'AWS cloud architecture',
        term: 'First Semester 2026-2027',
        instructor_id: 2
      },
      {
        id: 2,
        course_code: 'CCS3102',
        title: 'Database Management Systems',
        description: 'Relational MySQL design',
        term: 'First Semester 2026-2027',
        instructor_id: 3
      }
    ],
    enrollments: [
      { id: 1, student_id: 4, course_id: 1, status: 'active' },
      { id: 2, student_id: 5, course_id: 2, status: 'dropped' }
    ],
    materials: [
      {
        id: 1,
        course_id: 1,
        uploaded_by: 2,
        title: 'Week 1',
        file_name: 'w1.pdf',
        s3_key: 'materials/course-1/uuid-w1.pdf',
        mime_type: 'application/pdf',
        file_size: 1000
      }
    ],
    assignments: [
      {
        id: 1,
        course_id: 1,
        created_by: 2,
        title: 'Lab 1',
        instructions: 'Submit diagram',
        due_date: '2026-09-25 23:59:00',
        max_score: 100,
        attachment_file_name: 'rubric.pdf',
        attachment_s3_key: 'assignments/course-1/uuid-rubric.pdf'
      }
    ],
    submissions: [
      {
        id: 1,
        assignment_id: 1,
        student_id: 4,
        file_name: 'cruz.pdf',
        s3_key: 'submissions/assignment-1/student-4/uuid-cruz.pdf',
        mime_type: 'application/pdf',
        file_size: 2048,
        status: 'submitted'
      }
    ]
  });

  const storage = createMockStorage();
  const app = createApp({ db, storage });

  return {
    db,
    storage,
    app,
    adminToken: signToken({ id: 1, role: 'admin' }),
    inst2Token: signToken({ id: 2, role: 'instructor' }),
    inst3Token: signToken({ id: 3, role: 'instructor' }),
    student4Token: signToken({ id: 4, role: 'student' }),
    student5Token: signToken({ id: 5, role: 'student' })
  };
}

describe('Courses & Enrollments APIs', () => {
  it('lists courses with search & scope filters and returns detailed counts on GET /api/courses/:id', async () => {
    const { app, student4Token, inst2Token } = await buildFixture();

    const allRes = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.courses).toHaveLength(2);
    expect(allRes.body.data.courses[1]).toMatchObject({
      courseCode: 'CCS4301',
      instructorName: 'Prof. Marco Santos',
      activeStudentCount: 1,
      isEnrolled: true,
      enrollmentStatus: 'active'
    });

    const enrolledRes = await request(app)
      .get('/api/courses?scope=enrolled&search=Cloud')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(enrolledRes.status).toBe(200);
    expect(enrolledRes.body.data.courses).toHaveLength(1);
    expect(enrolledRes.body.data.courses[0].courseCode).toBe('CCS4301');

    const assignedRes = await request(app)
      .get('/api/courses?scope=assigned')
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(assignedRes.status).toBe(200);
    expect(assignedRes.body.data.courses.map((c) => c.courseCode)).toEqual([
      'CCS4301'
    ]);

    const detailRes = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.course).toMatchObject({
      id: 1,
      courseCode: 'CCS4301',
      instructorEmail: 'instructor.santos@ue-cloudlearn.edu.ph',
      materialCount: 1,
      assignmentCount: 1,
      activeStudentCount: 1,
      isEnrolled: true
    });

    const missingRes = await request(app)
      .get('/api/courses/999')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(missingRes.status).toBe(404);
    expect(missingRes.body.error.code).toBe('COURSE_NOT_FOUND');
  });

  it('creates courses as admin, validates active instructor, and enforces unique courseCode', async () => {
    const { app, adminToken, inst2Token, student4Token } = await buildFixture();

    const forbiddenRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({
        courseCode: 'CCS3204',
        title: 'Web Systems',
        instructorId: 2
      });
    expect(forbiddenRes.status).toBe(403);

    const badInstructorRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseCode: 'CCS3204',
        title: 'Web Systems',
        instructorId: 4 // student, not instructor
      });
    expect(badInstructorRes.status).toBe(400);
    expect(badInstructorRes.body.error.code).toBe('INVALID_INSTRUCTOR');

    const createRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseCode: 'ccs3204',
        title: 'Web Systems and Technologies',
        instructorId: 2
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.data.course).toMatchObject({
      courseCode: 'CCS3204',
      title: 'Web Systems and Technologies',
      instructorId: 2
    });

    const dupRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseCode: 'CCS3204',
        title: 'Duplicate',
        instructorId: 2
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('COURSE_CODE_EXISTS');

    const studentCreateRes = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${student4Token}`)
      .send({ courseCode: 'X', title: 'X', instructorId: 2 });
    expect(studentCreateRes.status).toBe(403);
  });

  it('allows assigned instructor to update description but blocks courseCode/instructorId changes and unassigned courses', async () => {
    const { app, adminToken, inst2Token, inst3Token } = await buildFixture();

    const okInstRes = await request(app)
      .patch('/api/courses/1')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ description: 'Updated syllabus description' });
    expect(okInstRes.status).toBe(200);
    expect(okInstRes.body.data.course.description).toBe(
      'Updated syllabus description'
    );

    const instCodeRes = await request(app)
      .patch('/api/courses/1')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ courseCode: 'CCS9999' });
    expect(instCodeRes.status).toBe(403);

    const otherInstRes = await request(app)
      .patch('/api/courses/1')
      .set('Authorization', `Bearer ${inst3Token}`)
      .send({ title: 'Hijack' });
    expect(otherInstRes.status).toBe(403);

    const adminReassignRes = await request(app)
      .patch('/api/courses/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ instructorId: 3, courseCode: 'CCS4301A' });
    expect(adminReassignRes.status).toBe(200);
    expect(adminReassignRes.body.data.course).toMatchObject({
      courseCode: 'CCS4301A',
      instructorId: 3
    });
  });

  it('deletes course as admin and cleans up associated S3 objects', async () => {
    const { app, storage, adminToken } = await buildFixture();

    const delRes = await request(app)
      .delete('/api/courses/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.data).toEqual({ deletedId: 1 });
    expect(storage.deletes).toEqual([
      'materials/course-1/uuid-w1.pdf',
      'assignments/course-1/uuid-rubric.pdf',
      'submissions/assignment-1/student-4/uuid-cruz.pdf'
    ]);
  });

  it('handles student enrollment, reactivation of dropped enrollment, unenrollment, and roster listing', async () => {
    const {
      app,
      adminToken,
      inst2Token,
      inst3Token,
      student4Token,
      student5Token
    } = await buildFixture();

    // Student 4 already enrolled in course 1 -> 409
    const dupEnroll = await request(app)
      .post('/api/courses/1/enroll')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(dupEnroll.status).toBe(409);
    expect(dupEnroll.body.error.code).toBe('ALREADY_ENROLLED');

    // Student 5 has dropped enrollment in course 2 -> reactivated 201
    const reactivateRes = await request(app)
      .post('/api/courses/2/enroll')
      .set('Authorization', `Bearer ${student5Token}`);
    expect(reactivateRes.status).toBe(201);
    expect(reactivateRes.body.data.enrollment.status).toBe('active');

    // Assigned instructor 2 views students in course 1; unassigned instructor 3 gets 403
    const rosterRes = await request(app)
      .get('/api/courses/1/students')
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(rosterRes.status).toBe(200);
    expect(rosterRes.body.data.students).toHaveLength(1);
    expect(rosterRes.body.data.students[0].fullName).toBe('Gabriel Cruz');

    const forbiddenRoster = await request(app)
      .get('/api/courses/1/students')
      .set('Authorization', `Bearer ${inst3Token}`);
    expect(forbiddenRoster.status).toBe(403);

    // Admin unenroll requires studentId query param
    const adminMissingParam = await request(app)
      .delete('/api/courses/1/enroll')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminMissingParam.status).toBe(400);

    // Student 4 self-drops
    const dropRes = await request(app)
      .delete('/api/courses/1/enroll')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(dropRes.status).toBe(200);
    expect(dropRes.body.data).toEqual({ unenrolled: true });

    const notEnrolledRes = await request(app)
      .delete('/api/courses/1/enroll')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(notEnrolledRes.status).toBe(404);
  });
});
