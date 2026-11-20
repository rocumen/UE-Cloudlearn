import { AppError, mapUserRow } from '../utils/response.js';

const USER_SELECT_COLUMNS =
  'id, full_name, email, role, status, created_at, updated_at';

const UPDATABLE_COLUMNS = {
  fullName: 'full_name',
  role: 'role',
  status: 'status'
};

export async function findUserByEmailWithPassword(db, email) {
  const [rows] = await db.execute(
    `SELECT ${USER_SELECT_COLUMNS}, password_hash FROM users WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows?.[0] || null;
}

export async function findUserById(db, id) {
  const [rows] = await db.execute(
    `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapUserRow(rows?.[0] || null);
}

export async function listUsers(db, { role } = {}) {
  if (role) {
    const [rows] = await db.execute(
      `SELECT ${USER_SELECT_COLUMNS} FROM users WHERE role = ? ORDER BY created_at DESC, id DESC`,
      [role]
    );
    return rows.map(mapUserRow);
  }

  const [rows] = await db.execute(
    `SELECT ${USER_SELECT_COLUMNS} FROM users ORDER BY created_at DESC, id DESC`,
    []
  );
  return rows.map(mapUserRow);
}

export async function createUser(
  db,
  { fullName, email, passwordHash, role = 'student', status = 'active' }
) {
  const existing = await findUserByEmailWithPassword(db, email);
  if (existing) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'An account with that email already exists.'
    );
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [fullName, email, passwordHash, role, status]
    );
    return await findUserById(db, result.insertId);
  } catch (err) {
    if (err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with that email already exists.'
      );
    }
    throw err;
  }
}

export async function updateUserById(db, id, updates) {
  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_COLUMNS)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    return findUserById(db, id);
  }

  params.push(id);

  const [result] = await db.execute(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  if (!result || result.affectedRows === 0) {
    return null;
  }

  return findUserById(db, id);
}

export async function deleteUserById(db, id) {
  try {
    const [result] = await db.execute('DELETE FROM users WHERE id = ?', [id]);
    return Boolean(result && result.affectedRows > 0);
  } catch (err) {
    if (err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.errno === 1451) {
      throw new AppError(
        409,
        'USER_IN_USE',
        'This user is linked to existing courses or materials. Reassign those records before deleting.'
      );
    }
    throw err;
  }
}

export async function updateSeededUserPasswords(db, passwordHash) {
  const [result] = await db.execute(
    'UPDATE users SET password_hash = ? WHERE email LIKE ?',
    [passwordHash, '%@ue-cloudlearn.edu.ph']
  );
  return result?.affectedRows ?? 0;
}
