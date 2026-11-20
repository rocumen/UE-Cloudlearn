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
        role: 'admin'
      },
      {
        id: 2,
        full_name: 'Prof. Marco Santos',
        email: 'instructor.santos@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'instructor'
      },
      {
        id: 3,
        full_name: 'Prof. Clarissa Reyes',
        email: 'instructor.reyes@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'instructor'
      },
      {
        id: 4,
        full_name: 'Gabriel Cruz',
        email: 'student.cruz@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'student'
      },
      {
        id: 5,
        full_name: 'Andrea Torres',
        email: 'student.torres@ue-cloudlearn.edu.ph',
        password_hash: hash,
        role: 'student'
      }
    ],
    courses: [
      {
        id: 1,
        course_code: 'CCS4301',
        title: 'Cloud Computing',
        instructor_id: 2
      },
      {
        id: 2,
        course_code: 'CCS3102',
        title: 'Database Systems',
        instructor_id: 3
      }
    ],
    enrollments: [
      { id: 1, student_id: 4, course_id: 1, status: 'active' },
      { id: 2, student_id: 4, course_id: 2, status: 'active' }
    ],
    assignments: [
      {
        id: 1,
        course_id: 1,
        created_by: 2,
        title: 'Lab 1: VPC',
        instructions: 'Submit VPC diagram',
        due_date: '2026-09-25 23:59:00',
        max_score: 100
      },
      {
        id: 2,
        course_id: 2,
        created_by: 3,
        title: 'Case Study: 3NF',
        instructions: 'Submit ERD',
        due_date: '2026-10-02 23:59:00',
        max_score: 50
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

describe('Submissions, Grading, Learning Records & Dashboard Summary APIs', () => {
  it('handles student submission create, ungraded replacement, grading bounds, and post-grade lock', async () => {
    const {
      app,
      storage,
      adminToken,
      inst2Token,
      inst3Token,
      student4Token,
      student5Token
    } = await buildFixture();

    // Unenrolled student 5 blocked -> 403
    const unauthSubmit = await request(app)
      .post('/api/assignments/1/submissions')
      .set('Authorization', `Bearer ${student5Token}`)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'unauth.pdf',
        contentType: 'application/pdf'
      });
    expect(unauthSubmit.status).toBe(403);

    // Enrolled student 4 submits -> 201
    const firstSubmit = await request(app)
      .post('/api/assignments/1/submissions')
      .set('Authorization', `Bearer ${student4Token}`)
      .field('studentNote', 'Initial VPC draft')
      .attach('file', Buffer.from('%PDF-1.4 v1'), {
        filename: 'cruz-vpc-v1.pdf',
        contentType: 'application/pdf'
      });
    expect(firstSubmit.status).toBe(201);
    const sub1 = firstSubmit.body.data.submission;
    expect(sub1.s3Key).toMatch(
      /^submissions\/assignment-1\/student-4\/.+-cruz-vpc-v1\.pdf$/
    );

    // Replace ungraded submission -> 200 and cleans up old S3 key
    const replaceSubmit = await request(app)
      .post('/api/assignments/1/submissions')
      .set('Authorization', `Bearer ${student4Token}`)
      .field('studentNote', 'Final VPC diagram')
      .attach('file', Buffer.from('%PDF-1.4 v2'), {
        filename: 'cruz-vpc-v2.pdf',
        contentType: 'application/pdf'
      });
    expect(replaceSubmit.status).toBe(200);
    expect(storage.deletes).toContain(sub1.s3Key);

    // Unassigned instructor 3 cannot view, download, or grade assignment 1 submission
    const inst3List = await request(app)
      .get('/api/assignments/1/submissions')
      .set('Authorization', `Bearer ${inst3Token}`);
    expect(inst3List.status).toBe(403);

    const inst3Grade = await request(app)
      .patch(`/api/submissions/${sub1.id}/grade`)
      .set('Authorization', `Bearer ${inst3Token}`)
      .send({ score: 90 });
    expect(inst3Grade.status).toBe(403);

    // Staff list scopes instructor 2 to course 1 only, while admin sees all
    const inst2StaffList = await request(app)
      .get('/api/submissions?status=submitted')
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(inst2StaffList.status).toBe(200);
    expect(inst2StaffList.body.data.submissions).toHaveLength(1);

    // Score exceeding maxScore (100) rejected -> 400
    const overScoreRes = await request(app)
      .patch(`/api/submissions/${sub1.id}/grade`)
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ score: 105, feedback: 'Too high' });
    expect(overScoreRes.status).toBe(400);
    expect(overScoreRes.body.error.code).toBe('VALIDATION_ERROR');

    // Valid grade -> 200
    const gradeRes = await request(app)
      .patch(`/api/submissions/${sub1.id}/grade`)
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ score: 92, feedback: 'Great CIDR breakdown.' });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.data.submission).toMatchObject({
      score: 92,
      feedback: 'Great CIDR breakdown.',
      status: 'graded'
    });

    // Graded submission cannot be replaced or deleted by student -> 409 ALREADY_GRADED
    const replaceGraded = await request(app)
      .post('/api/assignments/1/submissions')
      .set('Authorization', `Bearer ${student4Token}`)
      .attach('file', Buffer.from('%PDF-1.4 v3'), {
        filename: 'v3.pdf',
        contentType: 'application/pdf'
      });
    expect(replaceGraded.status).toBe(409);
    expect(replaceGraded.body.error.code).toBe('ALREADY_GRADED');

    const deleteGraded = await request(app)
      .delete(`/api/submissions/${sub1.id}`)
      .set('Authorization', `Bearer ${student4Token}`);
    expect(deleteGraded.status).toBe(409);
    expect(deleteGraded.body.error.code).toBe('ALREADY_GRADED');

    // Download presigned URL allowed for owner student, assigned instructor, admin; blocked for other student
    const dlStudent = await request(app)
      .get(`/api/submissions/${sub1.id}/download`)
      .set('Authorization', `Bearer ${student4Token}`);
    expect(dlStudent.status).toBe(200);
    expect(dlStudent.body.data.expiresIn).toBe(300);

    const dlOtherStudent = await request(app)
      .get(`/api/submissions/${sub1.id}/download`)
      .set('Authorization', `Bearer ${student5Token}`);
    expect(dlOtherStudent.status).toBe(403);

    // Admin can delete even graded submission if needed
    const adminDelete = await request(app)
      .delete(`/api/submissions/${sub1.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDelete.status).toBe(200);
  });

  it('computes SQL JOIN student learning records and role-specific dashboard summaries', async () => {
    const { app, adminToken, inst2Token, inst3Token, student4Token } =
      await buildFixture();

    // Student 4 submits assignment 1 (max 100) -> graded 90 (90%)
    const sub1Res = await request(app)
      .post('/api/assignments/1/submissions')
      .set('Authorization', `Bearer ${student4Token}`)
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'lab1.pdf',
        contentType: 'application/pdf'
      });
    await request(app)
      .patch(`/api/submissions/${sub1Res.body.data.submission.id}/grade`)
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ score: 90, feedback: 'Solid work' });

    // Assignment 2 (max 50) remains unsubmitted for student 4 -> check records & dashboard
    const recordsRes = await request(app)
      .get('/api/records/me')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(recordsRes.status).toBe(200);
    expect(recordsRes.body.data.summary).toEqual({
      enrolledCoursesCount: 2,
      totalAssignments: 2,
      submittedCount: 1,
      gradedCount: 1,
      averagePercent: 90
    });
    expect(recordsRes.body.data.courses).toHaveLength(2);
    expect(recordsRes.body.data.courses[0].items[0].status).toBe('not_submitted');
    expect(recordsRes.body.data.courses[1].courseAveragePercent).toBe(90);

    // Instructor cannot call /api/records/me
    const instRecordsRes = await request(app)
      .get('/api/records/me')
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(instRecordsRes.status).toBe(403);

    // Role dashboard summaries
    const studentDash = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(studentDash.status).toBe(200);
    expect(studentDash.body.data).toMatchObject({
      role: 'student',
      kpis: {
        enrolledCourses: 2,
        pendingAssignments: 1,
        averagePercent: 90
      }
    });
    expect(studentDash.body.data.upcomingAssignments).toHaveLength(1);
    expect(studentDash.body.data.recentGrades).toHaveLength(1);

    const instDash = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${inst3Token}`);
    expect(instDash.status).toBe(200);
    expect(instDash.body.data).toMatchObject({
      role: 'instructor',
      kpis: {
        assignedCourses: 1,
        pendingToGrade: 0,
        totalStudents: 1
      }
    });

    const adminDash = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDash.status).toBe(200);
    expect(adminDash.body.data).toMatchObject({
      role: 'admin',
      kpis: {
        totalUsers: 5,
        totalCourses: 2,
        totalEnrollments: 2
      }
    });
  });
});
