import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createMockDb } from './helpers/mockDb.js';

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: '24h'
  });
}

describe('Admin Users CRUD (/api/users/*)', () => {
  const buildFixture = async () => {
    const hash = await bcrypt.hash('TestPass123!', 10);
    const db = createMockDb({
      users: [
        {
          id: 1,
          full_name: 'Elena Navarro',
          email: 'admin@ue-cloudlearn.edu.ph',
          password_hash: hash,
          role: 'admin',
          status: 'active',
          created_at: new Date('2026-08-01T08:00:00Z')
        },
        {
          id: 2,
          full_name: 'Prof. Marco Santos',
          email: 'instructor.santos@ue-cloudlearn.edu.ph',
          password_hash: hash,
          role: 'instructor',
          status: 'active',
          created_at: new Date('2026-08-02T08:00:00Z')
        },
        {
          id: 3,
          full_name: 'Gabriel Cruz',
          email: 'student.cruz@ue-cloudlearn.edu.ph',
          password_hash: hash,
          role: 'student',
          status: 'active',
          created_at: new Date('2026-08-03T08:00:00Z')
        }
      ],
      referencedUserIds: [2]
    });
    const app = createApp({ db });
    return {
      db,
      app,
      adminToken: signToken({ id: 1, role: 'admin' }),
      instructorToken: signToken({ id: 2, role: 'instructor' }),
      studentToken: signToken({ id: 3, role: 'student' })
    };
  };

  it('enforces admin-only RBAC across /api/users endpoints', async () => {
    const { app, instructorToken, studentToken } = await buildFixture();

    const unauth = await request(app).get('/api/users');
    expect(unauth.status).toBe(401);

    for (const token of [instructorToken, studentToken]) {
      const listRes = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);
      expect(listRes.status).toBe(403);
      expect(listRes.body.error.code).toBe('FORBIDDEN');

      const createRes = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fullName: 'New User',
          email: 'new@ue.edu.ph',
          password: 'Password123!',
          role: 'student'
        });
      expect(createRes.status).toBe(403);
    }
  });

  it('lists users ordered newest first, supports ?role= filter, and rejects invalid role query', async () => {
    const { app, adminToken } = await buildFixture();

    const allRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.users.map((u) => u.id)).toEqual([3, 2, 1]);
    expect(allRes.body.data.users[0].password_hash).toBeUndefined();

    const instRes = await request(app)
      .get('/api/users?role=instructor')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(instRes.status).toBe(200);
    expect(instRes.body.data.users).toHaveLength(1);
    expect(instRes.body.data.users[0].role).toBe('instructor');

    const badRoleRes = await request(app)
      .get('/api/users?role=superuser')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(badRoleRes.status).toBe(400);
    expect(badRoleRes.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates users as admin and returns 409 on duplicate email', async () => {
    const { app, adminToken } = await buildFixture();

    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Prof. Clarissa Reyes',
        email: 'Instructor.Reyes@ue-cloudlearn.edu.ph',
        password: 'InstructorPass123!',
        role: 'instructor'
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.user).toMatchObject({
      fullName: 'Prof. Clarissa Reyes',
      email: 'instructor.reyes@ue-cloudlearn.edu.ph',
      role: 'instructor',
      status: 'active'
    });
    expect(createRes.body.data.user.password_hash).toBeUndefined();

    const dupRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Duplicate',
        email: 'instructor.reyes@ue-cloudlearn.edu.ph',
        password: 'InstructorPass123!',
        role: 'student'
      });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('updates user fields, blocks self-demotion/deactivation, and returns 404 for missing ID', async () => {
    const { app, adminToken } = await buildFixture();

    const updateRes = await request(app)
      .patch('/api/users/3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Gabriel M. Cruz', status: 'inactive' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.user).toMatchObject({
      id: 3,
      fullName: 'Gabriel M. Cruz',
      status: 'inactive'
    });

    const selfDemoteRes = await request(app)
      .patch('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'student' });
    expect(selfDemoteRes.status).toBe(400);
    expect(selfDemoteRes.body.error.code).toBe('SELF_MODIFY_FORBIDDEN');

    const selfDeactivateRes = await request(app)
      .patch('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(selfDeactivateRes.status).toBe(400);
    expect(selfDeactivateRes.body.error.code).toBe('SELF_MODIFY_FORBIDDEN');

    const emptyPatchRes = await request(app)
      .patch('/api/users/3')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(emptyPatchRes.status).toBe(400);
    expect(emptyPatchRes.body.error.code).toBe('VALIDATION_ERROR');

    const notFoundRes = await request(app)
      .patch('/api/users/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fullName: 'Nobody' });
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('deletes unreferenced users, blocks self-delete, and returns 409 USER_IN_USE on FK constraint', async () => {
    const { app, adminToken } = await buildFixture();

    const selfDeleteRes = await request(app)
      .delete('/api/users/1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(selfDeleteRes.status).toBe(400);
    expect(selfDeleteRes.body.error.code).toBe('SELF_DELETE_FORBIDDEN');

    const fkConflictRes = await request(app)
      .delete('/api/users/2')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(fkConflictRes.status).toBe(409);
    expect(fkConflictRes.body.error.code).toBe('USER_IN_USE');

    const deleteRes = await request(app)
      .delete('/api/users/3')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data).toEqual({ deletedId: 3 });

    const missingRes = await request(app)
      .delete('/api/users/3')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(missingRes.status).toBe(404);
    expect(missingRes.body.error.code).toBe('USER_NOT_FOUND');
  });
});
