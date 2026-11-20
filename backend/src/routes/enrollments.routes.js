import { Router } from 'express';
import { z } from 'zod';
import {
  enrollCourseHandler,
  listCourseStudentsHandler,
  unenrollCourseHandler
} from '../controllers/enrollments.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const courseIdParamSchema = z.object({
  courseId: z.coerce.number().int().positive()
});

const unenrollQuerySchema = z.object({
  studentId: z.coerce.number().int().positive().optional()
});

export function createEnrollmentsRouter() {
  const router = Router();

  router.use(requireAuth);

  router.post(
    '/:courseId/enroll',
    requireRole('student'),
    validate({ params: courseIdParamSchema }),
    enrollCourseHandler
  );
  router.delete(
    '/:courseId/enroll',
    requireRole('student', 'admin'),
    validate({ params: courseIdParamSchema, query: unenrollQuerySchema }),
    unenrollCourseHandler
  );
  router.get(
    '/:courseId/students',
    requireRole('admin', 'instructor'),
    validate({ params: courseIdParamSchema }),
    listCourseStudentsHandler
  );

  return router;
}
