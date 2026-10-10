import mysql from 'mysql2/promise';
import { env } from './config.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: true,
  namedPlaceholders: true,
});

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export async function one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export async function run(sql: string, params: any[] = []) {
  const [res] = await pool.execute(sql, params);
  return res as mysql.ResultSetHeader;
}