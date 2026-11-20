export function createMockStorage() {
  const objects = new Map();
  const uploads = [];
  const deletes = [];
  const signedUrls = [];

  return {
    objects,
    uploads,
    deletes,
    signedUrls,

    async uploadObject({ key, body, contentType }) {
      objects.set(key, {
        body,
        contentType,
        size: body?.length ?? 0
      });
      uploads.push({ key, contentType, size: body?.length ?? 0 });
      return { key };
    },

    async deleteObject({ key }) {
      if (!key) return;
      objects.delete(key);
      deletes.push(key);
    },

    async getDownloadUrl({ key, fileName, expiresInSeconds = 300 }) {
      const url = `https://ue-cloudlearn-test-bucket.s3.ap-southeast-1.amazonaws.com/${encodeURI(key)}?response-content-disposition=${encodeURIComponent(fileName || 'file')}&X-Amz-Expires=${expiresInSeconds}`;
      signedUrls.push({ key, fileName, expiresInSeconds, url });
      return url;
    }
  };
}
