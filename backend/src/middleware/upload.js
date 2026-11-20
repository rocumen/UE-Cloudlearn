import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/response.js';

export const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = {
  '.pdf': ['application/pdf'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  '.txt': ['text/plain'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.zip': ['application/zip', 'application/x-zip-compressed']
};

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  const allowedMimes = ALLOWED_UPLOAD_TYPES[ext];

  if (!allowedMimes || !allowedMimes.includes(mime)) {
    return cb(
      new AppError(
        400,
        'INVALID_FILE_TYPE',
        'Unsupported file type. Allowed formats: PDF, DOCX, PPTX, XLSX, TXT, PNG, JPG, ZIP.'
      )
    );
  }

  return cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES
  },
  fileFilter
});

export const uploadMaterialFile = upload.single('file');
export const uploadAssignmentAttachment = upload.single('attachment');
export const uploadSubmissionFile = upload.single('file');
