import { createApp } from './app.js';
import { createDbPool } from './config/db.js';
import { env } from './config/env.js';
import { createS3Storage } from './config/s3.js';

const db = createDbPool();
const storage = createS3Storage();
const app = createApp({ db, storage });

const server = app.listen(env.port, () => {
  console.log(`UE Cloudlearn API listening on port ${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await db.end();
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
