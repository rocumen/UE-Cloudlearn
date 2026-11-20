import { buildAssignmentKey } from '../config/s3.js';
import {
  collectAssignmentS3Keys,
  createAssignmentRecord,
  deleteAssignmentRecord,
  getAssignmentWithAccess,
  listAssignmentsForCourse,
  updateAssignmentRecord
} from '../services/assignment.service.js';
import { requireCourseWriteAccess } from '../services/course.service.js';
import { toMysqlDateTime } from '../utils/date.js';
import { AppError, sendSuccess } from '../utils/response.js';

function getStorageOrThrow(req) {
  const storage = req.app.locals.storage;
  if (!storage) {
    throw new AppError(
      500,
      'STORAGE_NOT_CONFIGURED',
      'File storage service is not configured.'
    );
  }
  return storage;
}

export async function verifyAssignmentCourseWrite(req, res, next) {
  try {
    const db = req.app.locals.db;
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please check your input and try again.',
        [{ field: 'courseId', message: 'Invalid courseId.' }]
      );
    }
    await requireCourseWriteAccess(db, courseId, req.user);
    return next();
  } catch (err) {
    return next(err);
  }
}

export async function listCourseAssignmentsHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { courseId } = req.validated.params;
    const assignments = await listAssignmentsForCourse(db, courseId, req.user);
    return sendSuccess(res, 200, { assignments });
  } catch (err) {
    return next(err);
  }
}

export async function createAssignmentHandler(req, res, next) {
  let uploadedKey = null;
  const storage = req.app.locals.storage;

  try {
    const db = req.app.locals.db;
    const { courseId } = req.validated.params;
    const { title, instructions, dueDate, maxScore } = req.validated.body;

    await requireCourseWriteAccess(db, courseId, req.user);
    const mysqlDueDate = toMysqlDateTime(dueDate);

    let attachmentFileName = null;
    if (req.file) {
      const s3 = getStorageOrThrow(req);
      uploadedKey = buildAssignmentKey(courseId, req.file.originalname);
      await s3.uploadObject({
        key: uploadedKey,
        body: req.file.buffer,
        contentType: req.file.mimetype
      });
      attachmentFileName = req.file.originalname;
    }

    const assignment = await createAssignmentRecord(db, {
      courseId,
      createdBy: req.user.id,
      title,
      instructions,
      dueDate: mysqlDueDate,
      maxScore,
      attachmentFileName,
      attachmentS3Key: uploadedKey
    });

    return sendSuccess(
      res,
      201,
      { assignment },
      'Assignment created successfully.'
    );
  } catch (err) {
    if (uploadedKey && storage) {
      await storage.deleteObject({ key: uploadedKey }).catch(() => {});
    }
    return next(err);
  }
}

export async function updateAssignmentHandler(req, res, next) {
  let newKey = null;
  const storage = req.app.locals.storage;

  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;
    const { title, instructions, dueDate, maxScore } = req.validated.body;

    const existing = await getAssignmentWithAccess(db, id, req.user, 'write');

    if (
      title === undefined &&
      instructions === undefined &&
      dueDate === undefined &&
      maxScore === undefined &&
      !req.file
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please check your input and try again.',
        [
          {
            field: 'body',
            message: 'Provide at least one assignment field or attachment.'
          }
        ]
      );
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (instructions !== undefined) updates.instructions = instructions;
    if (dueDate !== undefined) updates.dueDate = toMysqlDateTime(dueDate);
    if (maxScore !== undefined) updates.maxScore = maxScore;

    if (req.file) {
      const s3 = getStorageOrThrow(req);
      newKey = buildAssignmentKey(existing.course_id, req.file.originalname);
      await s3.uploadObject({
        key: newKey,
        body: req.file.buffer,
        contentType: req.file.mimetype
      });
      updates.attachmentFileName = req.file.originalname;
      updates.attachmentS3Key = newKey;
    }

    const assignment = await updateAssignmentRecord(db, id, updates);

    if (newKey && existing.attachment_s3_key && storage) {
      await storage
        .deleteObject({ key: existing.attachment_s3_key })
        .catch(() => {});
    }

    return sendSuccess(
      res,
      200,
      { assignment },
      'Assignment updated successfully.'
    );
  } catch (err) {
    if (newKey && storage) {
      await storage.deleteObject({ key: newKey }).catch(() => {});
    }
    return next(err);
  }
}

export async function deleteAssignmentHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;
    const { id } = req.validated.params;

    await getAssignmentWithAccess(db, id, req.user, 'write');
    const s3Keys = await collectAssignmentS3Keys(db, id);
    await deleteAssignmentRecord(db, id);

    if (storage && s3Keys.length > 0) {
      await Promise.allSettled(
        s3Keys.map((key) => storage.deleteObject({ key }))
      );
    }

    return sendSuccess(
      res,
      200,
      { deletedId: id },
      'Assignment deleted successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function downloadAssignmentAttachmentHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = getStorageOrThrow(req);
    const { id } = req.validated.params;

    const assignment = await getAssignmentWithAccess(db, id, req.user, 'read');
    if (!assignment.attachment_s3_key) {
      throw new AppError(
        404,
        'ATTACHMENT_NOT_FOUND',
        'This assignment has no reference attachment.'
      );
    }

    const url = await storage.getDownloadUrl({
      key: assignment.attachment_s3_key,
      fileName: assignment.attachment_file_name,
      expiresInSeconds: 300
    });

    return sendSuccess(res, 200, {
      url,
      expiresIn: 300,
      fileName: assignment.attachment_file_name
    });
  } catch (err) {
    return next(err);
  }
}
