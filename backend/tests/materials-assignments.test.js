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
      }
    ],
    enrollments: [{ id: 1, student_id: 4, course_id: 1, status: 'active' }]
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

describe('Materials & Assignments APIs', () => {
  it('validates file MIME/extension and 15 MB max upload size', async () => {
    const { app, inst2Token } = await buildFixture();

    const badExtRes = await request(app)
      .post('/api/courses/1/materials')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Bad Script')
      .attach('file', Buffer.from('echo hi'), {
        filename: 'malware.exe',
        contentType: 'application/x-msdownload'
      });
    expect(badExtRes.status).toBe(400);
    expect(badExtRes.body.error.code).toBe('INVALID_FILE_TYPE');

    const mismatchedMimeRes = await request(app)
      .post('/api/courses/1/materials')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Spoofed PDF')
      .attach('file', Buffer.from('not a pdf'), {
        filename: 'fake.pdf',
        contentType: 'text/plain'
      });
    expect(mismatchedMimeRes.status).toBe(400);
    expect(mismatchedMimeRes.body.error.code).toBe('INVALID_FILE_TYPE');

    const oversizedBuffer = Buffer.alloc(15 * 1024 * 1024 + 1, 0x25);
    const tooLargeRes = await request(app)
      .post('/api/courses/1/materials')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Huge PDF')
      .attach('file', oversizedBuffer, {
        filename: 'huge.pdf',
        contentType: 'application/pdf'
      });
    expect(tooLargeRes.status).toBe(400);
    expect(tooLargeRes.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('uploads, lists, updates (including file replacement), presigned-downloads, and deletes materials with S3 rollback on DB error', async () => {
    const {
      db,
      storage,
      app,
      inst2Token,
      inst3Token,
      student4Token,
      student5Token
    } = await buildFixture();

    // Missing file -> 400 FILE_REQUIRED
    const noFileRes = await request(app)
      .post('/api/courses/1/materials')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'No File Handout');
    expect(noFileRes.status).toBe(400);
    expect(noFileRes.body.error.code).toBe('FILE_REQUIRED');

    // Rollback S3 object if DB insert fails
    db.state.failNextInsertOnTable = 'materials';
    const rollbackRes = await request(app)
      .post('/api/courses/1/materials')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Rollback Handout')
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'Rollback Handout.pdf',
        contentType: 'application/pdf'
      });
    expect(rollbackRes.status).toBe(500);
    expect(storage.uploads).toHaveLength(1);
    expect(storage.deletes).toHaveLength(1);
    expect(storage.objects.size).toBe(0);

    // Valid upload by assigned instructor
    const uploadRes = await request(app)
      .post('/api/courses/1/materials')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Week 1 Handout')
      .field('description', 'Intro to AWS')
      .attach('file', Buffer.from('%PDF-1.4 content'), {
        filename: 'Week 1 Handout.pdf',
        contentType: 'application/pdf'
      });
    expect(uploadRes.status).toBe(201);
    const mat = uploadRes.body.data.material;
    expect(mat.s3Key).toMatch(/^materials\/course-1\/.+-week-1-handout\.pdf$/);

    // Enrolled student reads & downloads presigned URL; unenrolled student gets 403
    const listRes = await request(app)
      .get('/api/courses/1/materials')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.materials).toHaveLength(1);

    const forbiddenList = await request(app)
      .get('/api/courses/1/materials')
      .set('Authorization', `Bearer ${student5Token}`);
    expect(forbiddenList.status).toBe(403);

    const downloadRes = await request(app)
      .get(`/api/materials/${mat.id}/download`)
      .set('Authorization', `Bearer ${student4Token}`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.body.data.expiresIn).toBe(300);
    expect(downloadRes.body.data.url).toContain(mat.s3Key);

    // Unassigned instructor cannot modify or delete
    const unauthPatch = await request(app)
      .patch(`/api/materials/${mat.id}`)
      .set('Authorization', `Bearer ${inst3Token}`)
      .send({ title: 'Hijacked' });
    expect(unauthPatch.status).toBe(403);

    // Replace file deletes old S3 key
    const oldKey = mat.s3Key;
    const replaceRes = await request(app)
      .patch(`/api/materials/${mat.id}`)
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Week 1 Updated')
      .attach('file', Buffer.from('PK\x03\x04'), {
        filename: 'week-1-slides.pptx',
        contentType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
    expect(replaceRes.status).toBe(200);
    expect(replaceRes.body.data.material.title).toBe('Week 1 Updated');
    expect(storage.deletes).toContain(oldKey);

    const newKey = replaceRes.body.data.material.s3Key;
    const deleteRes = await request(app)
      .delete(`/api/materials/${mat.id}`)
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(deleteRes.status).toBe(200);
    expect(storage.deletes).toContain(newKey);
  });

  it('creates, lists (student mySubmission vs instructor counts), updates, downloads attachment, and deletes assignments', async () => {
    const { app, storage, inst2Token, student4Token, student5Token } =
      await buildFixture();

    const jsonAsnRes = await request(app)
      .post('/api/courses/1/assignments')
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({
        title: 'Lab 1: VPC Diagram',
        instructions: 'Design public and private subnets.',
        dueDate: '2026-09-25T23:59:00Z',
        maxScore: 100
      });
    expect(jsonAsnRes.status).toBe(201);
    const asn1 = jsonAsnRes.body.data.assignment;

    const noAttachmentRes = await request(app)
      .get(`/api/assignments/${asn1.id}/attachment`)
      .set('Authorization', `Bearer ${student4Token}`);
    expect(noAttachmentRes.status).toBe(404);
    expect(noAttachmentRes.body.error.code).toBe('ATTACHMENT_NOT_FOUND');

    const attachAsnRes = await request(app)
      .post('/api/courses/1/assignments')
      .set('Authorization', `Bearer ${inst2Token}`)
      .field('title', 'Lab 2: S3 & IAM')
      .field('instructions', 'Attach your IAM policy JSON.')
      .field('dueDate', '2026-10-16T23:59:00Z')
      .field('maxScore', '50')
      .attach('attachment', Buffer.from('%PDF-1.4'), {
        filename: 'lab2-rubric.pdf',
        contentType: 'application/pdf'
      });
    expect(attachAsnRes.status).toBe(201);
    const asn2 = attachAsnRes.body.data.assignment;
    expect(asn2.maxScore).toBe(50);
    expect(asn2.attachmentS3Key).toMatch(
      /^assignments\/course-1\/.+-lab2-rubric\.pdf$/
    );

    const dlAttachRes = await request(app)
      .get(`/api/assignments/${asn2.id}/attachment`)
      .set('Authorization', `Bearer ${student4Token}`);
    expect(dlAttachRes.status).toBe(200);
    expect(dlAttachRes.body.data.expiresIn).toBe(300);

    const forbiddenAttachRes = await request(app)
      .get(`/api/assignments/${asn2.id}/attachment`)
      .set('Authorization', `Bearer ${student5Token}`);
    expect(forbiddenAttachRes.status).toBe(403);

    const studentListRes = await request(app)
      .get('/api/courses/1/assignments')
      .set('Authorization', `Bearer ${student4Token}`);
    expect(studentListRes.status).toBe(200);
    expect(studentListRes.body.data.assignments[0].mySubmission).toBeNull();

    const instListRes = await request(app)
      .get('/api/courses/1/assignments')
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(instListRes.status).toBe(200);
    expect(instListRes.body.data.assignments[0].submissionCount).toBe(0);

    const patchRes = await request(app)
      .patch(`/api/assignments/${asn1.id}`)
      .set('Authorization', `Bearer ${inst2Token}`)
      .send({ maxScore: 120 });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.assignment.maxScore).toBe(120);

    const delRes = await request(app)
      .delete(`/api/assignments/${asn2.id}`)
      .set('Authorization', `Bearer ${inst2Token}`);
    expect(delRes.status).toBe(200);
    expect(storage.deletes).toContain(asn2.attachmentS3Key);
  });
});
