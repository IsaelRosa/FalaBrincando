/**
 * Cria/atualiza o banco, executa schema.sql + seed.sql e gera os hashes
 * de senha de demonstração.
 *
 *   npm run db:seed
 */
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const cfg = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  multipleStatements: true,
};

async function runFile(conn: mysql.Connection, file: string) {
  const sql = fs.readFileSync(path.resolve(process.cwd(), 'db', file), 'utf8');
  await conn.query(sql);
  console.log(`✔ ${file}`);
}

const main = async () => {
  const conn = await mysql.createConnection(cfg);
  await runFile(conn, 'schema.sql');
  await runFile(conn, 'seed.sql');

  const demoHash = await bcrypt.hash('falabrincando123', 10);
  await conn.query(
    'UPDATE users SET password_hash=? WHERE email IN (?,?)',
    [demoHash, 'demo@falabrincando.app', 'responsavel@falabrincando.app']
  );
  console.log('✔ Senhas de demonstração atualizadas (falabrincando123)');
  await conn.end();
  console.log('\nPronto! Logins:');
  console.log('  Fonoaudióloga: demo@falabrincando.app / falabrincando123');
  console.log('  Responsável:  responsavel@falabrincando.app / falabrincando123\n');
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});