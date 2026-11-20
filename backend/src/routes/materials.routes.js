import { Router } from 'express';
import { z } from 'zod';
import {
  createMaterialHandler,
  deleteMaterialHandler,
  downloadMaterialHandler,
  listCourseMaterialsHandler,
  updateMaterialHandler,
  verifyMaterialCourseWrite
} from '../controllers/materials.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { uploadMaterialFile } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';

const courseIdParamSchema = z.object({
  courseId: z.coerce.number().int().positive()
});

const materialIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createMaterialBodySchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(5000).nullable().optional().default(null)
});

const updateMaterialBodySchema = z.object({
  title: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(5000).nullable().optional()
});

export function createCourseMaterialsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/:courseId/materials',
    validate({ params: courseIdParamSchema }),
    listCourseMaterialsHandler
  );
  router.post(
    '/:courseId/materials',
    requireRole('admin', 'instructor'),
    validate({ params: courseIdParamSchema }),
    verifyMaterialCourseWrite,
    uploadMaterialFile,
    validate({ body: createMaterialBodySchema }),
    createMaterialHandler
  );

  return router;
}

export function createMaterialsRouter() {
  const router = Router();
  router.use(requireAuth);

  router.patch(
    '/:id',
    requireRole('admin', 'instructor'),
    validate({ params: materialIdParamSchema }),
    uploadMaterialFile,
    validate({ body: updateMaterialBodySchema }),
    updateMaterialHandler
  );
  router.delete(
    '/:id',
    requireRole('admin', 'instructor'),
    validate({ params: materialIdParamSchema }),
    deleteMaterialHandler
  );
  router.get(
    '/:id/download',
    validate({ params: materialIdParamSchema }),
    downloadMaterialHandler
  );

  return router;
}
