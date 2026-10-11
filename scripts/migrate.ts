/**
 * Migrações idempotentes — Hostinger/MySQL e MariaDB.
 * MySQL 8 não aceita "ADD COLUMN IF NOT EXISTS", então consultamos information_schema.
 *
 *   npm run db:migrate
 */
import mysql from 'mysql2/promise';

const cfg = {
  host: (process.env.DB_HOST ?? 'localhost').trim(),
  port: Number(process.env.DB_PORT) || 3306,
  user: (process.env.DB_USER ?? '').trim(),
  password: process.env.DB_PASSWORD ?? '',
  database: (process.env.DB_NAME ?? '').trim(),
};

type Col = { nome: string; tipo: string; extra?: string };

const COLUNAS: Record<string, Col[]> = {
  // ---------- Perfil infantil (item 3 do escopo) ----------
  patients: [
    { nome: 'avatar', tipo: 'VARCHAR(80)', extra: "DEFAULT '🦜'" },
    { nome: 'tipo_comunicacao', tipo: 'VARCHAR(40)', extra: "DEFAULT 'oral'" },
    { nome: 'necessidades', tipo: 'JSON' },
    { nome: 'preferencias', tipo: 'JSON' },
    { nome: 'acessibilidade', tipo: 'JSON' },
    { nome: 'observacoes_resp', tipo: 'TEXT' },
    { nome: 'metas', tipo: 'JSON' },
    { nome: 'avatar_url', tipo: 'VARCHAR(400)' },
  ],
  // ---------- Planos: richer activity description ----------
  activity_plans: [
    { nome: 'library_id', tipo: 'INT UNSIGNED' },
    { nome: 'objetivo', tipo: 'TEXT' },
    { nome: 'habilidade', tipo: 'VARCHAR(40)' },
    { nome: 'materiais', tipo: 'JSON' },
    { nome: 'passos', tipo: 'JSON' },
    { nome: 'modelo_fala', tipo: 'TEXT' },
    { nome: 'nivel', tipo: 'VARCHAR(20)', extra: "DEFAULT '1'" },
    { nome: 'criterios', tipo: 'TEXT' },
    { nome: 'adaptacoes', tipo: 'TEXT' },
    { nome: 'orientacoes', tipo: 'TEXT' },
  ],
};

async function temColuna(conn: mysql.Connection, tabela: string, coluna: string) {
  const [r] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [cfg.database, tabela, coluna]
  );
  return (r as any)[0].n > 0;
}

async function temTabela(conn: mysql.Connection, tabela: string) {
  const [r] = await conn.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [cfg.database, tabela]
  );
  return (r as any)[0].n > 0;
}

const TABELA_BIBLIOTECA = `
CREATE TABLE IF NOT EXISTS activity_library (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fono_id        INT UNSIGNED NULL,
  game_key       VARCHAR(40) NOT NULL,
  title          VARCHAR(160) NOT NULL,
  habilidade     VARCHAR(40) NOT NULL,
  descricao      TEXT NULL,
  objetivo       TEXT NULL,
  materiais      JSON NULL,
  passos         JSON NULL,
  modelo_fala    TEXT NULL,
  tempo_min      INT NOT NULL DEFAULT 10,
  idade_min      INT NOT NULL DEFAULT 3,
  idade_max      INT NOT NULL DEFAULT 12,
  nivel          VARCHAR(20) NOT NULL DEFAULT '1',
  criterios      TEXT NULL,
  adaptacoes     TEXT NULL,
  orientacoes    TEXT NULL,
  config         MEDIUMTEXT NULL,
  phoneme_id     INT UNSIGNED NULL,
  tags           JSON NULL,
  status         ENUM('rascunho','aprovado') NOT NULL DEFAULT 'aprovado',
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lib_hab (habilidade, idade_min, idade_max, nivel),
  INDEX idx_lib_fono (fono_id)
) ENGINE=InnoDB`;

async function main() {
  const conn = await mysql.createConnection({ ...cfg, connectTimeout: 10000 });
  console.log(`\nBanco: ${cfg.database}\n`);

  if (!(await temTabela(conn, 'patients'))) {
    console.error('✖ Tabelas base não existem. Importe db/schema.hostinger.sql primeiro.\n');
    process.exit(1);
  }

  for (const [tabela, cols] of Object.entries(COLUNAS)) {
    for (const c of cols) {
      if (await temColuna(conn, tabela, c.nome)) continue;
      const def = `${c.nome} ${c.tipo}${c.extra ? ' ' + c.extra : ''} NULL`;
      await conn.query(`ALTER TABLE \`${tabela}\` ADD COLUMN ${def}`);
      console.log(`✔ ${tabela}.${c.nome}`);
    }
  }

  await conn.query(TABELA_BIBLIOTECA);
  console.log('✔ activity_library');

  await conn.query(
    "INSERT IGNORE INTO game_types (slug,nome,descricao,sort_order) VALUES " +
    "('caca_sons','Caça aos Sons','Encontrar figuras com determinado som.',9)," +
    "('mundo_animais','Mundo dos Animais','Identificar animais e seus sons.',10)," +
    "('monte_palavra','Monte a Palavra','Associar imagens, sílabas e palavras.',11)," +
    "('qual_figura','Qual é a Figura?','Identificar objetos a partir de pistas.',12)," +
    "('roleta','Roleta das Palavras','Sortear palavras ou imagens para praticar.',13)," +
    "('missoes','Missões da Comunicação','Resolver situações cotidianas.',14)," +
    "('trilha','Trilha da Aventura','Avançar em etapas ao realizar atividades.',15)," +
    "('historia_interativa','História Interativa','Completar histórias e responder perguntas.',16)"
  );
  console.log('✔ novos tipos de jogo');

  // Backfill: activities created before Phase 2 inherit the skill from the
  // library entry with the same game_key, so indicators don't show "unclassified".
  const [porJogo] = await conn.query(
    `SELECT game_key, MIN(habilidade) AS habilidade
     FROM activity_library GROUP BY game_key`
  );
  const mapa = new Map<string, any>((porJogo as any[]).map((r: any) => [r.game_key, r]));
  let atualizados = 0;
  for (const [game, info] of mapa) {
    const [r] = await conn.query(
      `UPDATE activity_plans SET habilidade = ?,
         objetivo = COALESCE(objetivo, (SELECT objetivo FROM activity_library l
           WHERE l.game_key = ? LIMIT 1))
       WHERE game_key = ? AND habilidade IS NULL`,
      [info.habilidade, game, game]
    );
    if ((r as any).affectedRows) atualizados += (r as any).affectedRows;
  }
  console.log(`✔ ${atualizados} atividade(s) classificada(s) por habilidade`);

  await conn.end();
  console.log('\nMigração concluída.\n');
}

main().catch((e) => {
  console.error(`✖ ${e.code} — ${e.message}`);
  process.exit(1);
});