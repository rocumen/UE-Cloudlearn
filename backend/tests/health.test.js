import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('returns 200 and connected status when DB query succeeds', async () => {
    const mockDb = {
      async execute(sql) {
        if (sql.includes('SELECT 1')) {
          return [[{ ok: 1 }]];
        }
        return [[]];
      }
    };

    const app = createApp({ db: mockDb });
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        db: 'connected'
      }
    });
  });

  it('returns 503 with DB_UNAVAILABLE when DB query fails', async () => {
    const failingDb = {
      async execute() {
        throw new Error('ECONNREFUSED');
      }
    };

    const app = createApp({ db: failingDb });
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'DB_UNAVAILABLE',
        message: 'Database connection is unavailable.',
        details: []
      }
    });
  });

  it('returns 404 standard error envelope for unknown routes', async () => {
    const mockDb = {
      async execute() {
        return [[]];
      }
    };

    const app = createApp({ db: mockDb });
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint was not found.',
        details: []
      }
    });
  });
});
