import 'dotenv/config';
import { config } from 'dotenv';
config();

export const env = {
  port: Number(process.env.PORT ?? 3333),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'falabrincando',
  },
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpires: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  uploadDir: process.env.UPLOAD_DIR ?? './storage',
  uploadMaxMb: Number(process.env.UPLOAD_MAX_MB ?? 25),
};