import {
  collectCourseS3Keys,
  createCourse,
  deleteCourseById,
  findRawCourseById,
  getCourseDetailById,
  listCourses,
  requireCourseWriteAccess,
  updateCourseById
} from '../services/course.service.js';
import { AppError, sendSuccess } from '../utils/response.js';

export async function listCoursesHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { search, scope } = req.validated.query;
    const courses = await listCourses(db, {
      userId: req.user.id,
      search,
      scope
    });

    return sendSuccess(res, 200, { courses });
  } catch (err) {
    return next(err);
  }
}

export async function getCourseHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;
    const course = await getCourseDetailById(db, id, req.user.id);

    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    return sendSuccess(res, 200, { course });
  } catch (err) {
    return next(err);
  }
}

export async function createCourseHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const course = await createCourse(db, req.validated.body, req.user.id);

    return sendSuccess(
      res,
      201,
      { course },
      'Course created successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function updateCourseHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;
    const updates = req.validated.body;

    await requireCourseWriteAccess(db, id, req.user);

    if (
      req.user.role !== 'admin' &&
      (updates.courseCode !== undefined || updates.instructorId !== undefined)
    ) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Only administrators can change the course code or assigned instructor.'
      );
    }

    const course = await updateCourseById(db, id, updates, req.user.id);
    if (!course) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    return sendSuccess(
      res,
      200,
      { course },
      'Course updated successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function deleteCourseHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;
    const { id } = req.validated.params;

    const existing = await findRawCourseById(db, id);
    if (!existing) {
      throw new AppError(404, 'COURSE_NOT_FOUND', 'Course not found.');
    }

    const s3Keys = await collectCourseS3Keys(db, id);
    await deleteCourseById(db, id);

    if (storage && s3Keys.length > 0) {
      await Promise.allSettled(
        s3Keys.map((key) => storage.deleteObject({ key }))
      );
    }

    return sendSuccess(
      res,
      200,
      { deletedId: id },
      'Course deleted successfully.'
    );
  } catch (err) {
    return next(err);
  }
}
