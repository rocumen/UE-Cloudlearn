import crypto from 'node:crypto';
import path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';

export function sanitizeFileName(originalName) {
  const baseWithExt = path.basename(
    String(originalName || 'file').replaceAll('\\', '/')
  );
  const rawExt = path.extname(baseWithExt).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const ext = rawExt.slice(0, 12);
  const rawStem = ext ? baseWithExt.slice(0, baseWithExt.length - path.extname(baseWithExt).length) : baseWithExt;

  const cleanedStem = rawStem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return `${cleanedStem || 'file'}${ext}`;
}

export function buildMaterialKey(courseId, fileName) {
  return `materials/course-${courseId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function buildAssignmentKey(courseId, fileName) {
  return `assignments/course-${courseId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function buildSubmissionKey(assignmentId, studentId, fileName) {
  return `submissions/assignment-${assignmentId}/student-${studentId}/${crypto.randomUUID()}-${sanitizeFileName(fileName)}`;
}

export function createS3Client({ region = env.aws.region } = {}) {
  // Uses AWS SDK v3 default credential provider chain (EC2 IAM Role in production).
  return new S3Client({ region });
}

function buildContentDisposition(fileName) {
  const safeName = sanitizeFileName(fileName);
  return `attachment; filename="${safeName}"`;
}

export function createS3Storage({
  client = createS3Client(),
  bucket = env.aws.s3BucketName
} = {}) {
  if (!bucket) {
    throw new Error('S3 bucket name is required to initialize S3 storage.');
  }

  return {
    async uploadObject({ key, body, contentType }) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      });
      await client.send(command);
      return { key };
    },

    async deleteObject({ key }) {
      if (!key) return;
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      });
      await client.send(command);
    },

    async getDownloadUrl({ key, fileName, expiresInSeconds = 300 }) {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: buildContentDisposition(fileName)
      });
      return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
    }
  };
}
