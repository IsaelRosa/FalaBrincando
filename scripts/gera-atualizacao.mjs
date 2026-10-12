/**
 * Gera db/atualizacao.sql — atualizacao do banco 100% via phpMyAdmin.
 *
 * O MySQL nao aceita "ADD COLUMN IF NOT EXISTS", entao cada coluna usa o
 * padrao SET @sql / PREPARE / EXECUTE, que o phpMyAdmin executa sem erro.
 *
 *   node scripts/gera-atualizacao.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const COLUNAS = {
  patients: [
    // Sem DEFAULT com emoji: pode quebrar conforme o charset do importador.
    ['avatar', "VARCHAR(80) DEFAULT 'Fuba' NULL"],
    ['avatar_url', 'VARCHAR(400) NULL'],
    ['tipo_comunicacao', "VARCHAR(40) DEFAULT 'oral' NULL"],
    ['necessidades', 'JSON NULL'],
    ['preferencias', 'JSON NULL'],
    ['acessibilidade', 'JSON NULL'],
    ['observacoes_resp', 'TEXT NULL'],
    ['metas', 'JSON NULL'],
    ['lembrete_ativo', 'TINYINT(1) DEFAULT 0 NULL'],
    ['lembrete_hora', "VARCHAR(5) DEFAULT '18:00' NULL"],
    ['lembrete_dias', "VARCHAR(60) DEFAULT '1,2,3,4,5' NULL"],
    ['lembrete_texto', 'VARCHAR(200) NULL'],
  ],
  activity_plans: [
    ['library_id', 'INT UNSIGNED NULL'],
    ['objetivo', 'TEXT NULL'],
    ['habilidade', "VARCHAR(40) DEFAULT '1' NULL"],
    ['materiais', 'JSON NULL'],
    ['passos', 'JSON NULL'],
    ['modelo_fala', 'TEXT NULL'],
    ['nivel', "VARCHAR(20) DEFAULT '1' NULL"],
    ['criterios', 'TEXT NULL'],
    ['adaptacoes', 'TEXT NULL'],
    ['orientacoes', 'TEXT NULL'],
  ],
};

const colSql = (tabela, nome, tipo) => {
  // Aspas simples dentro de tipo (ex.: DEFAULT '18:00') precisam ser duplicadas,
  // porque o comando inteiro vive dentro de uma string delimitada por aspas.
  const tipoSql = tipo.replace(/'/g, "''");
  return `SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${tabela}' AND COLUMN_NAME = '${nome}') = 0,
  'ALTER TABLE \`${tabela}\` ADD COLUMN \`${nome}\` ${tipoSql}',
  'DO 0');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;`;
};

let out = `-- =====================================================================
-- FalaBrincando - ATUALIZACAO DO BANCO (para importar no phpMyAdmin)
--
-- Use com o BANCO SELECIONADO no topo do phpMyAdmin.
-- E idempotente: pode rodar varias vezes sem quebrar nada.
--
-- Depois de importar este arquivo, importe tambem:
--   db/biblioteca-completa.sql   (as 25 atividades)
-- =====================================================================

-- ---------- 1) Tabela da biblioteca de atividades ----------
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
) ENGINE=InnoDB;

-- ---------- 2) Tabela de gravacoes de voz (com autorizacao registrada) ----------
CREATE TABLE IF NOT EXISTS recordings (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id    INT UNSIGNED NOT NULL,
  activity_id   INT UNSIGNED NULL,
  uploaded_by   INT UNSIGNED NOT NULL,
  file_path     VARCHAR(400) NOT NULL,
  mime_type     VARCHAR(60) NOT NULL DEFAULT 'audio/webm',
  duracao_sec   INT NULL,
  label         VARCHAR(120) NULL,
  status        ENUM('pendente','revisto') NOT NULL DEFAULT 'pendente',
  reviewed_at   TIMESTAMP NULL,
  reviewed_by   INT UNSIGNED NULL,
  observacao    TEXT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grav_pat (patient_id, created_at),
  CONSTRAINT fk_grav_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_grav_usr FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB;

`;

// colunas
for (const [tabela, cols] of Object.entries(COLUNAS)) {
  out += `-- ---------- Colunas novas em ${tabela} ----------\n`;
  for (const [nome, tipo] of cols) out += colSql(tabela, nome, tipo) + '\n\n';
}

// jogos novos
out += `-- ---------- Novos tipos de jogo ----------\n`;
out += `INSERT IGNORE INTO game_types (slug,nome,descricao,sort_order) VALUES\n`
  + `('caca_sons','Caca aos Sons','Encontrar figuras com determinado som.',9),\n`
  + `('mundo_animais','Mundo dos Animais','Identificar animais e seus sons.',10),\n`
  + `('monte_palavra','Monte a Palavra','Associar imagens, silabas e palavras.',11),\n`
  + `('qual_figura','Qual e a Figura?','Identificar objetos a partir de pistas.',12),\n`
  + `('roleta','Roleta das Palavras','Sortear palavras ou imagens para praticar.',13),\n`
  + `('missoes','Missoes da Comunicacao','Resolver situacoes cotidianas.',14),\n`
  + `('trilha','Trilha da Aventura','Avancar em etapas ao realizar atividades.',15),\n`
  + `('historia_interativa','Historia Interativa','Completar historias e responder perguntas.',16);\n\n`
  + `-- ---------- Classifica por habilidade as atividades antigas ----------\n`
  + `UPDATE activity_plans a
   JOIN (SELECT game_key, MIN(habilidade) AS hab FROM activity_library GROUP BY game_key) l
     ON l.game_key = a.game_key
   SET a.habilidade = l.hab
   WHERE a.habilidade IS NULL;\n`;

fs.writeFileSync(path.join(process.cwd(), 'db', 'atualizacao.sql'), out, 'utf8');
console.log('db/atualizacao.sql gerado');