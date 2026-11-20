export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function sendSuccess(res, statusCode, data, message) {
  const payload = {
    success: true,
    data
  };

  if (message) {
    payload.message = message;
  }

  return res.status(statusCode).json(payload);
}

export function mapUserRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at ?? null,
    ...(row.updated_at !== undefined ? { updatedAt: row.updated_at } : {})
  };
}
