import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import {
  createAssignmentsRouter,
  createCourseAssignmentsRouter
} from './routes/assignments.routes.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createCoursesRouter } from './routes/courses.routes.js';
import { createEnrollmentsRouter } from './routes/enrollments.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import {
  createCourseMaterialsRouter,
  createMaterialsRouter
} from './routes/materials.routes.js';
import {
  createDashboardRouter,
  createRecordsRouter
} from './routes/records.routes.js';
import {
  createAssignmentSubmissionsRouter,
  createSubmissionsRouter
} from './routes/submissions.routes.js';
import { createUsersRouter } from './routes/users.routes.js';

export function createApp({ db, storage = null } = {}) {
  if (!db || typeof db.execute !== 'function') {
    throw new Error('createApp requires a db pool/client with an execute() method.');
  }

  const app = express();
  app.locals.db = db;
  app.locals.storage = storage;

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(morgan('dev'));
  }

  app.use('/api/health', createHealthRouter(db));
  app.use('/api/auth', createAuthRouter());
  app.use('/api/users', createUsersRouter());
  app.use('/api/courses', createCoursesRouter());
  app.use('/api/courses', createEnrollmentsRouter());
  app.use('/api/courses', createCourseMaterialsRouter());
  app.use('/api/materials', createMaterialsRouter());
  app.use('/api/courses', createCourseAssignmentsRouter());
  app.use('/api/assignments', createAssignmentsRouter());
  app.use('/api/assignments', createAssignmentSubmissionsRouter());
  app.use('/api/submissions', createSubmissionsRouter());
  app.use('/api/records', createRecordsRouter());
  app.use('/api/dashboard', createDashboardRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
