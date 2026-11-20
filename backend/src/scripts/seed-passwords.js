import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { createDbPool } from '../config/db.js';
import '../config/env.js';
import { updateSeededUserPasswords } from '../services/user.service.js';

export async function runSeedPasswords({ db, password }) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new Error(
      'SEED_DEMO_PASSWORD must be set and at least 8 characters long. Example: SEED_DEMO_PASSWORD="YourDemoPassword123!" npm run seed:passwords'
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return updateSeededUserPasswords(db, passwordHash);
}

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (typeof password !== 'string' || password.length < 8) {
    console.error(
      'Error: SEED_DEMO_PASSWORD environment variable is required and must be at least 8 characters.'
    );
    console.error(
      'Usage: SEED_DEMO_PASSWORD="YourStrongDemoPassword" npm run seed:passwords'
    );
    process.exit(1);
  }

  const db = createDbPool();
  try {
    const updatedCount = await runSeedPasswords({ db, password });
    console.log(
      `Updated password hashes for ${updatedCount} seeded @ue-cloudlearn.edu.ph account(s).`
    );
  } finally {
    await db.end();
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  main().catch((err) => {
    console.error('Failed to update seeded passwords:', err.message);
    process.exit(1);
  });
}
