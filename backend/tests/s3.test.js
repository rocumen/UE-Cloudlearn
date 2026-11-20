import { describe, expect, it } from 'vitest';
import {
  buildAssignmentKey,
  buildMaterialKey,
  buildSubmissionKey,
  createS3Storage,
  sanitizeFileName
} from '../src/config/s3.js';

describe('S3 config & storage helpers', () => {
  it('sanitizes filenames safely and builds exact S3 key prefixes', () => {
    expect(sanitizeFileName('../../Lecture Notes (Final)!.PDF')).toBe(
      'lecture-notes-final.pdf'
    );
    expect(sanitizeFileName('___')).toBe('file');
    expect(buildMaterialKey(12, 'Week 1.pdf')).toMatch(
      /^materials\/course-12\/[0-9a-f-]{36}-week-1\.pdf$/
    );
    expect(buildAssignmentKey(4, 'Rubric.docx')).toMatch(
      /^assignments\/course-4\/[0-9a-f-]{36}-rubric\.docx$/
    );
    expect(buildSubmissionKey(7, 9, 'Solution.zip')).toMatch(
      /^submissions\/assignment-7\/student-9\/[0-9a-f-]{36}-solution\.zip$/
    );
  });

  it('sends PutObjectCommand and DeleteObjectCommand via injected AWS SDK client', async () => {
    const sentCommands = [];
    const fakeClient = {
      async send(command) {
        sentCommands.push(command);
        return {};
      }
    };

    const storage = createS3Storage({
      client: fakeClient,
      bucket: 'ue-cloudlearn-unit-test'
    });

    await storage.uploadObject({
      key: 'materials/course-1/uuid-test.pdf',
      body: Buffer.from('%PDF-1.4'),
      contentType: 'application/pdf'
    });
    await storage.deleteObject({ key: 'materials/course-1/uuid-test.pdf' });
    await storage.deleteObject({ key: null });

    expect(sentCommands).toHaveLength(2);
    expect(sentCommands[0].input).toEqual({
      Bucket: 'ue-cloudlearn-unit-test',
      Key: 'materials/course-1/uuid-test.pdf',
      Body: Buffer.from('%PDF-1.4'),
      ContentType: 'application/pdf'
    });
    expect(sentCommands[1].input).toEqual({
      Bucket: 'ue-cloudlearn-unit-test',
      Key: 'materials/course-1/uuid-test.pdf'
    });
  });
});
