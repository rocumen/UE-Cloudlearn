import { Router } from 'express';
import { z } from 'zod';
import {
  createCourseHandler,
  deleteCourseHandler,
  getCourseHandler,
  listCoursesHandler,
  updateCourseHandler
} from '../controllers/courses.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const courseIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const listCoursesQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  scope: z.enum(['all', 'enrolled', 'assigned']).optional().default('all')
});

const createCourseBodySchema = z.object({
  courseCode: z
    .string()
    .trim()
    .min(2)
    .max(30)
    .transform((v) => v.toUpperCase()),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).nullable().optional().default(null),
  term: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .optional()
    .default('First Semester 2026-2027'),
  instructorId: z.coerce.number().int().positive()
});

const updateCourseBodySchema = z
  .object({
    courseCode: z
      .string()
      .trim()
      .min(2)
      .max(30)
      .transform((v) => v.toUpperCase())
      .optional(),
    title: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    term: z.string().trim().min(2).max(60).optional(),
    instructorId: z.coerce.number().int().positive().optional()
  })
  .refine(
    (data) =>
      data.courseCode !== undefined ||
      data.title !== undefined ||
      data.description !== undefined ||
      data.term !== undefined ||
      data.instructorId !== undefined,
    {
      message: 'Provide at least one course field to update.'
    }
  );

export function createCoursesRouter() {
  const router = Router();

  router.use(requireAuth);

  router.get('/', validate({ query: listCoursesQuerySchema }), listCoursesHandler);
  router.get('/:id', validate({ params: courseIdParamSchema }), getCourseHandler);
  router.post(
    '/',
    requireRole('admin'),
    validate({ body: createCourseBodySchema }),
    createCourseHandler
  );
  router.patch(
    '/:id',
    requireRole('admin', 'instructor'),
    validate({ params: courseIdParamSchema, body: updateCourseBodySchema }),
    updateCourseHandler
  );
  router.delete(
    '/:id',
    requireRole('admin'),
    validate({ params: courseIdParamSchema }),
    deleteCourseHandler
  );

  return router;
}
