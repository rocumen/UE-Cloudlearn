import { buildSubmissionKey } from '../config/s3.js';
import {
  deleteSubmissionRecord,
  findSubmissionContextById,
  gradeSubmissionRecord,
  listSubmissionsForAssignment,
  listSubmissionsForStaff,
  upsertSubmissionRecord,
  verifyStudentCanSubmit
} from '../services/submission.service.js';
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

export async function precheckStudentSubmission(req, res, next) {
  try {
    const db = req.app.locals.db;
    const assignmentId = Number(req.params.assignmentId);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please check your input and try again.',
        [{ field: 'assignmentId', message: 'Invalid assignmentId.' }]
      );
    }

    const context = await verifyStudentCanSubmit(db, assignmentId, req.user.id);
    req.submissionPrecheck = context;
    return next();
  } catch (err) {
    return next(err);
  }
}

export async function listStaffSubmissionsHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { status, courseId } = req.validated.query;
    const submissions = await listSubmissionsForStaff(db, req.user, {
      status,
      courseId
    });
    return sendSuccess(res, 200, { submissions });
  } catch (err) {
    return next(err);
  }
}

export async function listAssignmentSubmissionsHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { assignmentId } = req.validated.params;
    const submissions = await listSubmissionsForAssignment(
      db,
      assignmentId,
      req.user
    );
    return sendSuccess(res, 200, { submissions });
  } catch (err) {
    return next(err);
  }
}

export async function createOrReplaceSubmissionHandler(req, res, next) {
  let newKey = null;
  const storage = req.app.locals.storage;

  try {
    const db = req.app.locals.db;
    const s3 = getStorageOrThrow(req);
    const { assignmentId } = req.validated.params;
    const { studentNote } = req.validated.body;

    const { existing } =
      req.submissionPrecheck ||
      (await verifyStudentCanSubmit(db, assignmentId, req.user.id));

    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', 'Please attach a file to submit.');
    }

    newKey = buildSubmissionKey(
      assignmentId,
      req.user.id,
      req.file.originalname
    );
    await s3.uploadObject({
      key: newKey,
      body: req.file.buffer,
      contentType: req.file.mimetype
    });

    const { submission, replaced } = await upsertSubmissionRecord(db, {
      existingId: existing?.id ?? null,
      assignmentId,
      studentId: req.user.id,
      fileName: req.file.originalname,
      s3Key: newKey,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      studentNote: studentNote ?? null
    });

    if (replaced && existing?.s3_key) {
      await s3.deleteObject({ key: existing.s3_key }).catch(() => {});
    }

    return sendSuccess(
      res,
      replaced ? 200 : 201,
      { submission },
      replaced
        ? 'Submission replaced successfully.'
        : 'Assignment submitted successfully.'
    );
  } catch (err) {
    if (newKey && storage) {
      await storage.deleteObject({ key: newKey }).catch(() => {});
    }
    return next(err);
  }
}

export async function deleteSubmissionHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = req.app.locals.storage;
    const { id } = req.validated.params;

    const submission = await findSubmissionContextById(db, id);
    if (!submission) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
    }

    if (req.user.role === 'student') {
      if (submission.student_id !== req.user.id) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'You can only delete your own submissions.'
        );
      }
      if (submission.status === 'graded') {
        throw new AppError(
          409,
          'ALREADY_GRADED',
          'This assignment has already been graded and cannot be deleted.'
        );
      }
    } else if (req.user.role !== 'admin') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to delete this submission.'
      );
    }

    await deleteSubmissionRecord(db, id);

    if (storage && submission.s3_key) {
      await storage.deleteObject({ key: submission.s3_key }).catch(() => {});
    }

    return sendSuccess(
      res,
      200,
      { deletedId: id },
      'Submission deleted successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function downloadSubmissionHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const storage = getStorageOrThrow(req);
    const { id } = req.validated.params;

    const submission = await findSubmissionContextById(db, id);
    if (!submission) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
    }

    const canDownload =
      req.user.role === 'admin' ||
      (req.user.role === 'instructor' &&
        submission.instructor_id === req.user.id) ||
      (req.user.role === 'student' && submission.student_id === req.user.id);

    if (!canDownload) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to download this submission.'
      );
    }

    const url = await storage.getDownloadUrl({
      key: submission.s3_key,
      fileName: submission.file_name,
      expiresInSeconds: 300
    });

    return sendSuccess(res, 200, {
      url,
      expiresIn: 300,
      fileName: submission.file_name,
      mimeType: submission.mime_type
    });
  } catch (err) {
    return next(err);
  }
}

export async function gradeSubmissionHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;
    const { score, feedback, status } = req.validated.body;

    const submission = await findSubmissionContextById(db, id);
    if (!submission) {
      throw new AppError(404, 'SUBMISSION_NOT_FOUND', 'Submission not found.');
    }

    const canGrade =
      req.user.role === 'admin' ||
      (req.user.role === 'instructor' &&
        submission.instructor_id === req.user.id);

    if (!canGrade) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'You do not have permission to grade this submission.'
      );
    }

    const maxScore = Number(submission.max_score);
    if (score > maxScore) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please check your input and try again.',
        [
          {
            field: 'score',
            message: `Score cannot exceed assignment max score (${maxScore}).`
          }
        ]
      );
    }

    const updated = await gradeSubmissionRecord(db, id, {
      score,
      feedback: feedback ?? null,
      status
    });

    return sendSuccess(
      res,
      200,
      { submission: updated },
      'Submission graded successfully.'
    );
  } catch (err) {
    return next(err);
  }
}
