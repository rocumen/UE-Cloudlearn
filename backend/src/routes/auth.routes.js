import { Router } from 'express';
import { z } from 'zod';
import {
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(190)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72)
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(190)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72)
});

export function createAuthRouter() {
  const router = Router();

  router.post('/register', validate({ body: registerSchema }), registerHandler);
  router.post('/login', validate({ body: loginSchema }), loginHandler);
  router.post('/logout', requireAuth, logoutHandler);
  router.get('/me', requireAuth, meHandler);

  return router;
}
