/**
 * Cria ou corrige as senhas dos usuários de demonstração.
 *
 *   npm run db:users
 *
 * Útil quando o seed foi importado pelo phpMyAdmin ou quando as senhas
 * foram trocadas. Gera o hash bcrypt correto na hora.
 */
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const SENHA_DEMO = 'falabrincando123';

const cfg = {
  host: (process.env.DB_HOST ?? 'localhost').trim(),
  port: Number(process.env.DB_PORT) || 3306,
  user: (process.env.DB_USER ?? '').trim(),
  password: process.env.DB_PASSWORD ?? '',
  database: (process.env.DB_NAME ?? '').trim(),
};

const USUARIOS = [
  { email: 'demo@falabrincando.app', role: 'fono', display_name: 'Dra. Demonstração (fictícia)' },
  { email: 'responsavel@falabrincando.app', role: 'responsavel', display_name: 'Responsável Demonstração' },
];

const main = async () => {
  const conn = await mysql.createConnection({ ...cfg, connectTimeout: 10000 });
  console.log(`\nBanco: ${cfg.user}@${cfg.host}/${cfg.database}\n`);

  const [tabelas] = await conn.query('SHOW TABLES LIKE "users"');
  if (!(tabelas as any[]).length) {
    console.error('✖ A tabela "users" não existe. Importe db/schema.hostinger.sql pelo phpMyAdmin.\n');
    process.exit(1);
  }

  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(SENHA_DEMO, 10);
    const [r] = await conn.query(
      `INSERT INTO users (email, password_hash, role, display_name)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)`,
      [u.email, hash, u.role, u.display_name]
    );
    console.log(`✔ ${u.email}  (${(r as any).affectedRows === 1 ? 'criado' : 'senha atualizada'})`);
  }

  const [todos] = await conn.query('SELECT id, email, role FROM users ORDER BY id');
  console.log('\nUsuários no banco:');
  (todos as any[]).forEach((t) => console.log(`  [${t.role}] ${t.email}`));
  console.log(`\nSenha de todos: ${SENHA_DEMO}\n`);

  await conn.end();
};

main().catch((e) => {
  console.error(`\n✖ ${e.code} — ${e.message}`);
  console.error('Rode antes: npm run db:check\n');
  process.exit(1);
});