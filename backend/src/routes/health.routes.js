import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';

export function createHealthRouter(db) {
  const router = Router();

  router.get('/', async (req, res) => {
    try {
      await db.execute('SELECT 1 AS ok', []);
      return sendSuccess(res, 200, { status: 'ok', db: 'connected' });
    } catch {
      return res.status(503).json({
        success: false,
        error: {
          code: 'DB_UNAVAILABLE',
          message: 'Database connection is unavailable.',
          details: []
        }
      });
    }
  });

  return router;
}
