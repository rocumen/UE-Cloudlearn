import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { createMockDb } from './helpers/mockDb.js';

describe('Authentication & RBAC (/api/auth/*)', () => {
  it('registers a student, normalizes email, forces student role, sets HttpOnly cookie, and omits password_hash', async () => {
    const db = createMockDb();
    const app = createApp({ db });
    const agent = request.agent(app);

    const res = await agent.post('/api/auth/register').send({
      fullName: '  Maria Santos  ',
      email: 'Maria.Santos@UE.EDU.PH',
      password: 'StrongPassword123!',
      role: 'admin'
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({
      id: 1,
      fullName: 'Maria Santos',
      email: 'maria.santos@ue.edu.ph',
      role: 'student',
      status: 'active'
    });
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const setCookieHeader = res.headers['set-cookie']?.join('; ') || '';
    expect(setCookieHeader).toContain('ue_cloudlearn_token=');
    expect(setCookieHeader).toContain('HttpOnly');
    expect(setCookieHeader).toContain('SameSite=Lax');

    // Cookie carries session cleanly into GET /api/auth/me
    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('maria.santos@ue.edu.ph');
  });

  it('returns 409 EMAIL_ALREADY_EXISTS on duplicate registration', async () => {
    const existingHash = await bcrypt.hash('ExistingPass123!', 10);
    const db = createMockDb({
      users: [
        {
          id: 1,
          full_name: 'Gabriel Cruz',
          email: 'student.cruz@ue-cloudlearn.edu.ph',
          password_hash: existingHash,
          role: 'student',
          status: 'active'
        }
      ]
    });
    const app = createApp({ db });

    const res = await request(app).post('/api/auth/register').send({
      fullName: 'Gabriel Cruz',
      email: 'STUDENT.CRUZ@ue-cloudlearn.edu.ph',
      password: 'AnotherPassword123!'
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns 400 VALIDATION_ERROR for invalid register payload and 400 INVALID_JSON for malformed JSON', async () => {
    const db = createMockDb();
    const app = createApp({ db });

    const invalidRes = await request(app).post('/api/auth/register').send({
      fullName: 'A',
      email: 'not-an-email',
      password: '123'
    });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');
    expect(invalidRes.body.error.details.length).toBeGreaterThanOrEqual(3);

    const malformedRes = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken');

    expect(malformedRes.status).toBe(400);
    expect(malformedRes.body.error.code).toBe('INVALID_JSON');
  });

  it('logs in active user, rejects wrong password or placeholder hash with 401, and rejects inactive user with 403', async () => {
    const validHash = await bcrypt.hash('CorrectPass123!', 10);
    const db = createMockDb({
      users: [
        {
          id: 1,
          full_name: 'Elena Navarro',
          email: 'admin@ue-cloudlearn.edu.ph',
          password_hash: validHash,
          role: 'admin',
          status: 'active'
        },
        {
          id: 2,
          full_name: 'Inactive Student',
          email: 'inactive@ue-cloudlearn.edu.ph',
          password_hash: validHash,
          role: 'student',
          status: 'inactive'
        },
        {
          id: 3,
          full_name: 'Unseeded Account',
          email: 'unseeded@ue-cloudlearn.edu.ph',
          password_hash: 'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT',
          role: 'student',
          status: 'active'
        }
      ]
    });
    const app = createApp({ db });
    const agent = request.agent(app);

    const okRes = await agent.post('/api/auth/login').send({
      email: 'ADMIN@ue-cloudlearn.edu.ph',
      password: 'CorrectPass123!'
    });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.user.role).toBe('admin');
    expect(okRes.body.data.user.password_hash).toBeUndefined();

    const wrongPassRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ue-cloudlearn.edu.ph',
      password: 'WrongPassword!'
    });
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.code).toBe('INVALID_CREDENTIALS');

    const placeholderRes = await request(app).post('/api/auth/login').send({
      email: 'unseeded@ue-cloudlearn.edu.ph',
      password: 'CorrectPass123!'
    });
    expect(placeholderRes.status).toBe(401);
    expect(placeholderRes.body.error.code).toBe('INVALID_CREDENTIALS');

    const inactiveRes = await request(app).post('/api/auth/login').send({
      email: 'inactive@ue-cloudlearn.edu.ph',
      password: 'CorrectPass123!'
    });
    expect(inactiveRes.status).toBe(403);
    expect(inactiveRes.body.error.code).toBe('ACCOUNT_INACTIVE');

    const logoutRes = await agent.post('/api/auth/logout');
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data).toEqual({ loggedOut: true });

    const meAfterLogout = await agent.get('/api/auth/me');
    expect(meAfterLogout.status).toBe(401);
  });

  it('supports Authorization: Bearer fallback and rejects invalid/missing tokens or inactive accounts in requireAuth', async () => {
    const validHash = await bcrypt.hash('Pass12345!', 10);
    const db = createMockDb({
      users: [
        {
          id: 10,
          full_name: 'Prof. Marco Santos',
          email: 'instructor.santos@ue-cloudlearn.edu.ph',
          password_hash: validHash,
          role: 'instructor',
          status: 'active'
        },
        {
          id: 11,
          full_name: 'Disabled User',
          email: 'disabled@ue-cloudlearn.edu.ph',
          password_hash: validHash,
          role: 'student',
          status: 'inactive'
        }
      ]
    });
    const app = createApp({ db });

    const activeToken = jwt.sign({ sub: 10, role: 'instructor' }, env.jwtSecret, {
      expiresIn: '24h'
    });
    const inactiveToken = jwt.sign({ sub: 11, role: 'student' }, env.jwtSecret, {
      expiresIn: '24h'
    });

    const missingRes = await request(app).get('/api/auth/me');
    expect(missingRes.status).toBe(401);
    expect(missingRes.body.error.code).toBe('UNAUTHORIZED');

    const badTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-valid-jwt');
    expect(badTokenRes.status).toBe(401);
    expect(badTokenRes.body.error.code).toBe('INVALID_TOKEN');

    const inactiveRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${inactiveToken}`);
    expect(inactiveRes.status).toBe(403);
    expect(inactiveRes.body.error.code).toBe('ACCOUNT_INACTIVE');

    const bearerRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${activeToken}`);
    expect(bearerRes.status).toBe(200);
    expect(bearerRes.body.data.user).toMatchObject({
      id: 10,
      email: 'instructor.santos@ue-cloudlearn.edu.ph',
      role: 'instructor'
    });
  });
});
