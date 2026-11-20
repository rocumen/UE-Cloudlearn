import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, mapUserRow } from '../utils/response.js';

export const AUTH_COOKIE_NAME = 'ue_cloudlearn_token';

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  };
}

function extractToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  const authHeader = req.headers?.authorization;
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1].trim().length > 0) {
      return match[1].trim();
    }
  }

  return null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError(
        401,
        'UNAUTHORIZED',
        'Authentication required. Please log in.'
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.jwtSecret);
    } catch {
      throw new AppError(
        401,
        'INVALID_TOKEN',
        'Your session has expired or is invalid. Please log in again.'
      );
    }

    const userId = Number(decoded?.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError(
        401,
        'INVALID_TOKEN',
        'Your session is invalid. Please log in again.'
      );
    }

    const db = req.app.locals.db;
    const [rows] = await db.execute(
      'SELECT id, full_name, email, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    const userRow = rows?.[0];
    if (!userRow) {
      throw new AppError(
        401,
        'UNAUTHORIZED',
        'Account not found. Please log in again.'
      );
    }

    if (userRow.status !== 'active') {
      throw new AppError(
        403,
        'ACCOUNT_INACTIVE',
        'Your account is inactive. Contact an administrator.'
      );
    }

    req.user = mapUserRow(userRow);
    return next();
  } catch (err) {
    return next(err);
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError(401, 'UNAUTHORIZED', 'Authentication required. Please log in.')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'FORBIDDEN',
          'You do not have permission to perform this action.'
        )
      );
    }

    return next();
  };
}
