/**
 * Controle de acesso dos responsáveis.
 *
 *   node scripts/migrate-acesso.mjs   (gera db/acesso.sql)
 *
 * Acrescenta senha definida pela fonoaudióloga, período de validade e
 * suspensão do acesso. Sem isso, o responsável continua enxergando o plano
 * depois do tratamento.
 */
import fs from 'node:fs';
import path from 'node:path';

const col = (tabela, nome, tipo) => {
  // Aspas simples dentro do tipo precisam ser duplicadas: o comando vive
  // dentro de uma string delimitada por aspas simples.
  const t = tipo.replace(/'/g, "''");
  return `SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='${tabela}' AND COLUMN_NAME='${nome}')=0,'ALTER TABLE \`${tabela}\` ADD COLUMN \`${nome}\` ${t}','DO 0');\nPREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;`;
};

const out = `-- =====================================================================
-- FalaBrincando - CONTROLE DE ACESSO DOS RESPONSAVEIS
--
-- Importar na aba SQL do phpMyAdmin, com o banco selecionado.
-- Idempotente: pode rodar varias vezes.
--
-- Acrescenta a patient_guardians:
--   senha_hash   senha sugerida pela fonoaudióloga (bcrypt)
--   valido_de    início do acesso
--   valido_ate   fim do acesso (fim do tratamento)
--   status       ativo | suspenso | encerrado
-- =====================================================================

CREATE TABLE IF NOT EXISTS patient_guardians (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id  INT UNSIGNED NOT NULL,
  guardian_id INT UNSIGNED NOT NULL,
  relation    VARCHAR(40) NULL,
  can_record  TINYINT(1) NOT NULL DEFAULT 1,
  can_share   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guard (patient_id, guardian_id),
  CONSTRAINT fk_pg_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_gua_usr FOREIGN KEY (guardian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Controle de acesso
${col('patient_guardians', 'senha_hash', 'VARCHAR(255) NULL')}
${col('patient_guardians', 'valido_de', 'DATE NULL')}
${col('patient_guardians', 'valido_ate', 'DATE NULL')}
${col('patient_guardians', 'status', "ENUM('ativo','suspenso','encerrado') NOT NULL DEFAULT 'ativo'")}
${col('patient_guardians', 'criado_por', 'INT UNSIGNED NULL')}
${col('patient_guardians', 'observacao_acesso', 'VARCHAR(255) NULL')}

-- Paciente: período de tratamento, para amarrar o acesso do responsável
${col('patients', 'tratamento_inicio', 'DATE NULL')}
${col('patients', 'tratamento_fim', 'DATE NULL')}

-- ============================================================================
-- A PARTIR DAQUI O APP USA ISSO (executado pelo backend, nao precisa rodar):
-- o login do responsável passa a checar status e validade.
-- ============================================================================
`;

fs.writeFileSync(path.join(process.cwd(), 'db', 'acesso.sql'), out, 'utf8');
console.log('db/acesso.sql gerado');