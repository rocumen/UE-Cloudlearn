import {
  enrollStudentInCourse,
  listEnrolledStudentsForCourse,
  unenrollStudentFromCourse
} from '../services/enrollment.service.js';
import { AppError, sendSuccess } from '../utils/response.js';

export async function enrollCourseHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { courseId } = req.validated.params;

    const enrollment = await enrollStudentInCourse(db, courseId, req.user.id);
    return sendSuccess(
      res,
      201,
      { enrollment },
      'Enrolled in course successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function unenrollCourseHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { courseId } = req.validated.params;
    const { studentId } = req.validated.query;

    let targetStudentId = req.user.id;
    if (req.user.role === 'admin') {
      if (!studentId) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          'Please check your input and try again.',
          [
            {
              field: 'studentId',
              message: 'Administrators must specify studentId query parameter.'
            }
          ]
        );
      }
      targetStudentId = studentId;
    }

    await unenrollStudentFromCourse(db, courseId, targetStudentId);
    return sendSuccess(
      res,
      200,
      { unenrolled: true },
      'Enrollment removed successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function listCourseStudentsHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { courseId } = req.validated.params;

    const students = await listEnrolledStudentsForCourse(
      db,
      courseId,
      req.user
    );
    return sendSuccess(res, 200, { students });
  } catch (err) {
    return next(err);
  }
}
