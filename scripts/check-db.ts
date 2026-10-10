/**
 * Diagnóstico de conexão com o banco.
 *
 *   npm run db:check
 *
 * Testa a configuração atual e mostra exatamente onde está o problema.
 * Útil na Hostinger, onde usuário/senha/banco precisam bater com o hPanel.
 */
import mysql from 'mysql2/promise';

const clean = (v: string | undefined) => (v ?? '').trim();

const cfg = {
  host: clean(process.env.DB_HOST) || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: clean(process.env.DB_USER),
  password: process.env.DB_PASSWORD ?? '',
  database: clean(process.env.DB_NAME),
};

function mask(s: string) {
  if (!s) return '(vazio)';
  if (s.length <= 3) return '*'.repeat(s.length);
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
}

console.log('\n=== FalaBrincando — diagnóstico do banco ===\n');
console.log('Configuração atual:');
console.log(`  DB_HOST     = ${cfg.host}`);
console.log(`  DB_PORT     = ${cfg.port}`);
console.log(`  DB_USER     = ${cfg.user || '(VAZIO!)'}`);
console.log(`  DB_PASSWORD = ${mask(cfg.password)}${cfg.password ? '' : '  (VAZIO!)'}`);
console.log(`  DB_NAME     = ${cfg.database || '(VAZIO!)'}`);
console.log('');

if (!cfg.user || !cfg.password || !cfg.database) {
  console.log('✖ Faltam variáveis de ambiente. Preencha DB_USER, DB_PASSWORD e DB_NAME.\n');
  process.exit(1);
}

const t0 = Date.now();

async function tentar(nome: string, c: any, mostrarBancos = false) {
  const conn = await mysql.createConnection({ ...c, connectTimeout: 8000 });
  const [bancos] = await conn.query('SHOW DATABASES');
  const [tabelas] = await conn.query('SHOW TABLES');
  const nomeBanco = (bancos as any[]).map((b) => Object.values(b)[0]);
  const tabs = (tabelas as any[]).map((t) => Object.values(t)[0]);

  console.log(`✔ ${nome}`);
  console.log(`  Bancos visíveis: ${nomeBanco.join(', ')}`);
  console.log(`  Tabelas em "${c.database}": ${tabs.length}`);
  if (tabs.length) console.log(`    ${tabs.join(', ')}`);

  if (tabs.length < 14)
    console.log('  ⚠ Faltam tabelas. Importe db/schema.hostinger.sql pelo phpMyAdmin.');

  if (mostrarBancos && !nomeBanco.includes(cfg.database))
    console.log(`  ⚠ O banco "${cfg.database}" não está entre os visíveis para este usuário.`);

  if (tabs.length) {
    const [u] = await conn.query('SELECT COUNT(*) AS n FROM users');
    console.log(`  Usuários cadastrados: ${(u as any)[0].n}`);
  }
  await conn.end();
  console.log('');
  return true;
}

try {
  await tentar('Conexão OK! Tudo certo.', cfg, true);
  console.log(`⏱ ${Date.now() - t0}ms\n`);
  console.log('Próximo passo: abra o site e faça login com');
  console.log('  demo@falabrincando.app / falabrincando123\n');
  process.exit(0);
} catch (e: any) {
  console.log(`✖ Falhou: ${e.code} — ${e.message}\n`);
}

console.log('O que costuma ser a causa na Hostinger:\n');

// Sugere os bancos padrão da Hostinger para o usuário informado
if (cfg.user.includes('_')) {
  const prefix = cfg.user.split('_')[0];
  const sufixo = cfg.user.split('_').slice(1).join('_');
  console.log('  1) DB_NAME provavelmente deve ser:');
  console.log(`       ${prefix}_${sufixo}`);
  console.log('     (o hPanel mostra o nome do banco em "Bancos de Dados MySQL")\n');
}

console.log('  2) DB_PASSWORD deve ser a senha EXATA gerada no hPanel.');
console.log('     Atenção: a Hostinger mostra a senha uma única vez,');
console.log('     no momento em que o usuário do banco é criado.\n');

console.log('  3) O usuário MySQL precisa estar associado ao banco');
console.log('     (em hPanel › Bancos de Dados MySQL, coluna "Usuários").\n');

console.log('  4) Copie os valores em hPanel › Bancos de Dados MySQL:');
console.log('     Host, Usuário, Senha e Nome do banco.\n');
process.exit(1);