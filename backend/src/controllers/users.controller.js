import bcrypt from 'bcryptjs';
import {
  createUser,
  deleteUserById,
  listUsers,
  updateUserById
} from '../services/user.service.js';
import { AppError, sendSuccess } from '../utils/response.js';

export async function listUsersHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { role } = req.validated.query;
    const users = await listUsers(db, { role });

    return sendSuccess(res, 200, { users });
  } catch (err) {
    return next(err);
  }
}

export async function createUserHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { fullName, email, password, role, status } = req.validated.body;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser(db, {
      fullName,
      email,
      passwordHash,
      role,
      status
    });

    return sendSuccess(res, 201, { user }, 'User created successfully.');
  } catch (err) {
    return next(err);
  }
}

export async function updateUserHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;
    const { fullName, role, status } = req.validated.body;

    if (
      id === req.user.id &&
      ((role !== undefined && role !== 'admin') ||
        (status !== undefined && status !== 'active'))
    ) {
      throw new AppError(
        400,
        'SELF_MODIFY_FORBIDDEN',
        'You cannot demote your own role or deactivate your own account.'
      );
    }

    const updatedUser = await updateUserById(db, id, {
      fullName,
      role,
      status
    });

    if (!updatedUser) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    return sendSuccess(
      res,
      200,
      { user: updatedUser },
      'User updated successfully.'
    );
  } catch (err) {
    return next(err);
  }
}

export async function deleteUserHandler(req, res, next) {
  try {
    const db = req.app.locals.db;
    const { id } = req.validated.params;

    if (id === req.user.id) {
      throw new AppError(
        400,
        'SELF_DELETE_FORBIDDEN',
        'You cannot delete your own account.'
      );
    }

    const deleted = await deleteUserById(db, id);
    if (!deleted) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
    }

    return sendSuccess(res, 200, { deletedId: id }, 'User deleted successfully.');
  } catch (err) {
    return next(err);
  }
}
