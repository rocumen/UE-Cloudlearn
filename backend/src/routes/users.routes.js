import { Router } from 'express';
import { z } from 'zod';
import {
  createUserHandler,
  deleteUserHandler,
  listUsersHandler,
  updateUserHandler
} from '../controllers/users.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const roleEnum = z.enum(['admin', 'instructor', 'student']);
const statusEnum = z.enum(['active', 'inactive']);

const listUsersQuerySchema = z.object({
  role: roleEnum.optional()
});

const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const createUserBodySchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(190)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
  role: roleEnum,
  status: statusEnum.optional().default('active')
});

const updateUserBodySchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional()
  })
  .refine(
    (data) =>
      data.fullName !== undefined ||
      data.role !== undefined ||
      data.status !== undefined,
    {
      message: 'Provide at least one field to update (fullName, role, or status).'
    }
  );

export function createUsersRouter() {
  const router = Router();

  router.use(requireAuth, requireRole('admin'));

  router.get('/', validate({ query: listUsersQuerySchema }), listUsersHandler);
  router.post('/', validate({ body: createUserBodySchema }), createUserHandler);
  router.patch(
    '/:id',
    validate({ params: userIdParamSchema, body: updateUserBodySchema }),
    updateUserHandler
  );
  router.delete(
    '/:id',
    validate({ params: userIdParamSchema }),
    deleteUserHandler
  );

  return router;
}
