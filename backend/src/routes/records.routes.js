import { Router } from 'express';
import {
  getDashboardSummaryHandler,
  getMyRecordsHandler
} from '../controllers/records.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export function createRecordsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get('/me', requireRole('student'), getMyRecordsHandler);

  return router;
}

export function createDashboardRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get('/summary', getDashboardSummaryHandler);

  return router;
}
