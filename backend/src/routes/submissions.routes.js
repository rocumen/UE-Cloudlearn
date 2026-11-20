import { Router } from 'express';
import { z } from 'zod';
import {
  createOrReplaceSubmissionHandler,
  deleteSubmissionHandler,
  downloadSubmissionHandler,
  gradeSubmissionHandler,
  listAssignmentSubmissionsHandler,
  listStaffSubmissionsHandler,
  precheckStudentSubmission
} from '../controllers/submissions.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadSubmissionFile } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const assignmentIdParamSchema = z.object({
  assignmentId: z.coerce.number().int().positive()
});

const submissionIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const listStaffSubmissionsQuerySchema = z.object({
  status: z.enum(['submitted', 'graded', 'returned']).optional(),
  courseId: z.coerce.number().int().positive().optional()
});

const createSubmissionBodySchema = z.object({
  studentNote: z.string().trim().max(2000).nullable().optional().default(null)
});

const gradeSubmissionBodySchema = z.object({
  score: z.coerce.number().min(0),
  feedback: z.string().trim().max(2000).nullable().optional().default(null),
  status: z.enum(['graded', 'returned']).optional().default('graded')
});

export function createAssignmentSubmissionsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/:assignmentId/submissions',
    requireRole('admin', 'instructor'),
    validate({ params: assignmentIdParamSchema }),
    listAssignmentSubmissionsHandler
  );
  router.post(
    '/:assignmentId/submissions',
    requireRole('student'),
    validate({ params: assignmentIdParamSchema }),
    precheckStudentSubmission,
    uploadSubmissionFile,
    validate({ body: createSubmissionBodySchema }),
    createOrReplaceSubmissionHandler
  );

  return router;
}

export function createSubmissionsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    requireRole('admin', 'instructor'),
    validate({ query: listStaffSubmissionsQuerySchema }),
    listStaffSubmissionsHandler
  );
  router.delete(
    '/:id',
    requireRole('student', 'admin'),
    validate({ params: submissionIdParamSchema }),
    deleteSubmissionHandler
  );
  router.get(
    '/:id/download',
    validate({ params: submissionIdParamSchema }),
    downloadSubmissionHandler
  );
  router.patch(
    '/:id/grade',
    requireRole('admin', 'instructor'),
    validate({ params: submissionIdParamSchema, body: gradeSubmissionBodySchema }),
    gradeSubmissionHandler
  );

  return router;
}
