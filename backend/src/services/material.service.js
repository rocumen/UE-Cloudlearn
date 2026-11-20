import { AppError } from '../utils/response.js';
import {
  requireCourseReadAccess,
  requireCourseWriteAccess
} from './course.service.js';

function mapMaterialRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    courseId: row.course_id,
    uploadedBy: row.uploaded_by,
    uploaderName: row.uploader_name ?? null,
    title: row.title,
    description: row.description ?? null,
    fileName: row.file_name,
    s3Key: row.s3_key,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findMaterialById(db, materialId) {
  const [rows] = await db.execute(
    `SELECT
       m.id,
       m.course_id,
       m.uploaded_by,
       u.full_name AS uploader_name,
       m.title,
       m.description,
       m.file_name,
       m.s3_key,
       m.mime_type,
       m.file_size,
       m.created_at,
       m.updated_at
     FROM materials AS m
     INNER JOIN users AS u ON u.id = m.uploaded_by
     WHERE m.id = ?
     LIMIT 1`,
    [materialId]
  );
  return rows?.[0] || null;
}

export async function listMaterialsForCourse(db, courseId, user) {
  await requireCourseReadAccess(db, courseId, user);

  const [rows] = await db.execute(
    `SELECT
       m.id,
       m.course_id,
       m.uploaded_by,
       u.full_name AS uploader_name,
       m.title,
       m.description,
       m.file_name,
       m.s3_key,
       m.mime_type,
       m.file_size,
       m.created_at,
       m.updated_at
     FROM materials AS m
     INNER JOIN users AS u ON u.id = m.uploaded_by
     WHERE m.course_id = ?
     ORDER BY m.created_at DESC, m.id DESC`,
    [courseId]
  );

  return rows.map(mapMaterialRow);
}

export async function createMaterialRecord(
  db,
  { courseId, uploadedBy, title, description = null, fileName, s3Key, mimeType, fileSize }
) {
  const [result] = await db.execute(
    `INSERT INTO materials
       (course_id, uploaded_by, title, description, file_name, s3_key, mime_type, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [courseId, uploadedBy, title, description, fileName, s3Key, mimeType, fileSize]
  );

  const row = await findMaterialById(db, result.insertId);
  return mapMaterialRow(row);
}

const UPDATABLE_MATERIAL_COLUMNS = {
  title: 'title',
  description: 'description',
  fileName: 'file_name',
  s3Key: 's3_key',
  mimeType: 'mime_type',
  fileSize: 'file_size'
};

export async function updateMaterialRecord(db, materialId, updates) {
  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(UPDATABLE_MATERIAL_COLUMNS)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(updates[key]);
    }
  }

  if (setClauses.length === 0) {
    const existing = await findMaterialById(db, materialId);
    return mapMaterialRow(existing);
  }

  params.push(materialId);
  const [result] = await db.execute(
    `UPDATE materials SET ${setClauses.join(', ')} WHERE id = ?`,
    params
  );

  if (!result || result.affectedRows === 0) {
    return null;
  }

  const updated = await findMaterialById(db, materialId);
  return mapMaterialRow(updated);
}

export async function deleteMaterialRecord(db, materialId) {
  const [result] = await db.execute('DELETE FROM materials WHERE id = ?', [
    materialId
  ]);
  return Boolean(result && result.affectedRows > 0);
}

export async function getMaterialWithAccess(db, materialId, user, mode = 'read') {
  const row = await findMaterialById(db, materialId);
  if (!row) {
    throw new AppError(404, 'MATERIAL_NOT_FOUND', 'Learning material not found.');
  }

  if (mode === 'write') {
    await requireCourseWriteAccess(db, row.course_id, user);
  } else {
    await requireCourseReadAccess(db, row.course_id, user);
  }

  return row;
}
