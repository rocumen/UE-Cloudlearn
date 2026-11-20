import mysql from 'mysql2/promise';
import { env } from './env.js';

export function createDbPool(overrides = {}) {
  return mysql.createPool({
    host: overrides.host ?? env.db.host,
    port: overrides.port ?? env.db.port,
    user: overrides.user ?? env.db.user,
    password: overrides.password ?? env.db.password,
    database: overrides.database ?? env.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    decimalNumbers: true
  });
}
