import bcrypt from 'bcryptjs';
import { describe, expect, it } from 'vitest';
import { runSeedPasswords } from '../src/scripts/seed-passwords.js';
import { createMockDb } from './helpers/mockDb.js';

describe('seed-passwords script', () => {
  it('rejects missing or short SEED_DEMO_PASSWORD values', async () => {
    const db = createMockDb();

    await expect(runSeedPasswords({ db, password: '' })).rejects.toThrow(
      /at least 8 characters/i
    );
    await expect(runSeedPasswords({ db, password: 'short' })).rejects.toThrow(
      /at least 8 characters/i
    );
  });

  it('hashes password with bcryptjs and updates only @ue-cloudlearn.edu.ph accounts via parameterized SQL', async () => {
    const db = createMockDb({
      users: [
        {
          id: 1,
          full_name: 'Elena Navarro',
          email: 'admin@ue-cloudlearn.edu.ph',
          password_hash: 'PENDING_BCRYPTJS_HASH_RUN_SEED_SCRIPT',
          role: 'admin',
          status: 'active'
        },
        {
          id: 2,
          full_name: 'External User',
          email: 'external@example.com',
          password_hash: 'UNCHANGED_HASH',
          role: 'student',
          status: 'active'
        }
      ]
    });

    const updatedCount = await runSeedPasswords({
      db,
      password: 'SeededDemoPassword123!'
    });

    expect(updatedCount).toBe(1);
    expect(
      await bcrypt.compare(
        'SeededDemoPassword123!',
        db.state.users[0].password_hash
      )
    ).toBe(true);
    expect(db.state.users[1].password_hash).toBe('UNCHANGED_HASH');
    expect(db.state.queries[0].sql).toBe(
      'UPDATE users SET password_hash = ? WHERE email LIKE ?'
    );
  });
});
