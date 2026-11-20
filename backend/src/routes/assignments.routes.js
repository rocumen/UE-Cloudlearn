import { Router } from 'express';
import { z } from 'zod';
import {
  createAssignmentHandler,
  deleteAssignmentHandler,
  downloadAssignmentAttachmentHandler,
  listCourseAssignmentsHandler,
  updateAssignmentHandler,
  verifyAssignmentCourseWrite
} from '../controllers/assignments.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadAssignmentAttachment } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const courseIdParamSchema = z.object({
  courseId: z.coerce.number().int().positive()
});

const assignmentIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createAssignmentBodySchema = z.object({
  title: z.string().trim().min(2).max(180),
  instructions: z.string().trim().min(2).max(5000),
  dueDate: z.string().trim().min(1),
  maxScore: z.coerce.number().int().positive().max(10000).optional().default(100)
});

const updateAssignmentBodySchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  instructions: z.string().trim().min(2).max(5000).optional(),
  dueDate: z.string().trim().min(1).optional(),
  maxScore: z.coerce.number().int().positive().max(10000).optional()
});

export function createCourseAssignmentsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/:courseId/assignments',
    validate({ params: courseIdParamSchema }),
    listCourseAssignmentsHandler
  );
  router.post(
    '/:courseId/assignments',
    requireRole('admin', 'instructor'),
    validate({ params: courseIdParamSchema }),
    verifyAssignmentCourseWrite,
    uploadAssignmentAttachment,
    validate({ body: createAssignmentBodySchema }),
    createAssignmentHandler
  );

  return router;
}

export function createAssignmentsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.patch(
    '/:id',
    requireRole('admin', 'instructor'),
    validate({ params: assignmentIdParamSchema }),
    uploadAssignmentAttachment,
    validate({ body: updateAssignmentBodySchema }),
    updateAssignmentHandler
  );
  router.delete(
    '/:id',
    requireRole('admin', 'instructor'),
    validate({ params: assignmentIdParamSchema }),
    deleteAssignmentHandler
  );
  router.get(
    '/:id/attachment',
    validate({ params: assignmentIdParamSchema }),
    downloadAssignmentAttachmentHandler
  );

  return router;
}
