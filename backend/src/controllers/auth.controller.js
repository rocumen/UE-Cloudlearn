import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '../middleware/auth.js';
import {
  createUser,
  findUserByEmailWithPassword
} from '../services/user.service.js';
import { AppError, mapUserRow, sendSuccess } from '../utils/response.js';

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

function signAuthToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: '24h'
  });
}

export async function registerHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { fullName, email, password } = req.validated.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(db, {
      fullName,
      email,
      passwordHash,
      role: 'student',
      status: 'active'
    });

    const token = signAuthToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return sendSuccess(
      res,
      201,
      { user },
      'Account registered successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { email, password } = req.validated.body;

    const userRow = await findUserByEmailWithPassword(db, email);
    if (
      !userRow ||
      typeof userRow.password_hash !== 'string' ||
      !BCRYPT_HASH_PATTERN.test(userRow.password_hash)
    ) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Incorrect email or password. Try again.'
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      userRow.password_hash
    );
    if (!passwordMatches) {
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Incorrect email or password. Try again.'
      );
    }

    if (userRow.status !== 'active') {
      throw new AppError(
        403,
        'ACCOUNT_INACTIVE',
        'Your account is inactive. Contact an administrator.'
      );
    }

    const user = mapUserRow(userRow);
    const token = signAuthToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    return sendSuccess(res, 200, { user }, 'Logged in successfully.');
  } catch (err) {
    return next(err);
  }
}

export function logoutHandler(req, res) {
  const { maxAge: _maxAge, ...clearOptions } = getAuthCookieOptions();
  res.clearCookie(AUTH_COOKIE_NAME, clearOptions);

  return sendSuccess(res, 200, { loggedOut: true }, 'Logged out successfully.');
}

export function meHandler(req, res) {
  return sendSuccess(res, 200, { user: req.user });
}
