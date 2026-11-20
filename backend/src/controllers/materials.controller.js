import { buildMaterialKey } from '../config/s3.js';
import { requireCourseWriteAccess } from '../services/course.service.js';
import {
  createMaterialRecord,
  deleteMaterialRecord,
  getMaterialWithAccess,
  listMaterialsForCourse,
  updateMaterialRecord
} from '../services/material.service.js';
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

export async function verifyMaterialCourseWrite(req, res, next) {
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

export async function listCourseMaterialsHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { courseId } = req.validated.params;
    const materials = await listMaterialsForCourse(db, courseId, req.user);
    return sendSuccess(res, 200, { materials });
  } catch (err) {
    return next(err);
  }
}

export async function createMaterialHandler(req, res, next) {
  let uploadedKey = null;
  const storage = req.app.locals.storage;

  try {
    const db = req.app.locals.db;
    const s3 = getStorageOrThrow(req);
    const { courseId } = req.validated.params;
    const { title, description } = req.validated.body;

    await requireCourseWriteAccess(db, courseId, req.user);

    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Please attach a file to upload.');
    }

    uploadedKey = buildMaterialKey(courseId, req.file.originalname);
    await s3.uploadObject({
      key: uploadedKey,
      body: req.file.buffer,
      contentType: req.file.mimetype
    });

    const material = await createMaterialRecord(db, {
      courseId,
      uploadedBy: req.user.id,
      title,
      description: description ?? null,
      fileName: req.file.originalname,
      s3Key: uploadedKey,
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    });

    return sendSuccess(
      res,
      201,
      { material },
      'Learning material uploaded successfully.'
    );
  } catch (err) {
    if (uploadedKey && storage) {
      await storage.deleteObject({ key: uploadedKey }).catch(() => {});
    }
    return next(err);
  }
}

export async function updateMaterialHandler(req, res, next) {
  let newS3Key = null;
  const storage = req.app.locals.storage;

  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;
    const { title, description } = req.validated.body;

    const existing = await getMaterialWithAccess(db, id, req.user, 'write');

    if (
      title === undefined &&
      description === undefined &&
      !req.file
    ) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please check your input and try again.',
        [
          {
            field: 'body',
            message: 'Provide title, description, or a replacement file.'
          }
        ]
      );
    }

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    if (req.file) {
      const s3 = getStorageOrThrow(req);
      newS3Key = buildMaterialKey(existing.course_id, req.file.originalname);
      await s3.uploadObject({
        key: newS3Key,
        body: req.file.buffer,
        contentType: req.file.mimetype
      });
      updates.fileName = req.file.originalname;
      updates.s3Key = newS3Key;
      updates.mimeType = req.file.mimetype;
      updates.fileSize = req.file.size;
    }

    const material = await updateMaterialRecord(db, id, updates);

    if (newS3Key && existing.s3_key && storage) {
      await storage.deleteObject({ key: existing.s3_key }).catch(() => {});
    }

    return sendSuccess(
      res,
      200,
      { material },
      'Learning material updated successfully.'
    );
  } catch (err) {
    if (newS3Key && storage) {
      await storage.deleteObject({ key: newS3Key }).catch(() => {});
    }
    return next(err);
  }
}

export async function deleteMaterialHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;
    const { id } = req.validated.params;

    const existing = await getMaterialWithAccess(db, id, req.user, 'write');
    await deleteMaterialRecord(db, id);

    if (storage && existing.s3_key) {
      await storage.deleteObject({ key: existing.s3_key }).catch(() => {});
    }

    return sendSuccess(
      res,
      200,
      { deletedId: id },
      'Learning material deleted successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function downloadMaterialHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = getStorageOrThrow(req);
    const { id } = req.validated.params;

    const material = await getMaterialWithAccess(db, id, req.user, 'read');
    const url = await storage.getDownloadUrl({
      key: material.s3_key,
      fileName: material.file_name,
      expiresInSeconds: 300
    });

    return sendSuccess(res, 200, {
      url,
      expiresIn: 300,
      fileName: material.file_name,
      mimeType: material.mime_type
    });
  } catch (err) {
    return next(err);
  }
}
