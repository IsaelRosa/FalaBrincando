-- =====================================================================
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
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_guardians' AND COLUMN_NAME='senha_hash')=0,'ALTER TABLE `patient_guardians` ADD COLUMN `senha_hash` VARCHAR(255) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_guardians' AND COLUMN_NAME='valido_de')=0,'ALTER TABLE `patient_guardians` ADD COLUMN `valido_de` DATE NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_guardians' AND COLUMN_NAME='valido_ate')=0,'ALTER TABLE `patient_guardians` ADD COLUMN `valido_ate` DATE NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_guardians' AND COLUMN_NAME='status')=0,'ALTER TABLE `patient_guardians` ADD COLUMN `status` ENUM(''ativo'',''suspenso'',''encerrado'') NOT NULL DEFAULT ''ativo''','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_guardians' AND COLUMN_NAME='criado_por')=0,'ALTER TABLE `patient_guardians` ADD COLUMN `criado_por` INT UNSIGNED NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patient_guardians' AND COLUMN_NAME='observacao_acesso')=0,'ALTER TABLE `patient_guardians` ADD COLUMN `observacao_acesso` VARCHAR(255) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- Paciente: período de tratamento, para amarrar o acesso do responsável
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='tratamento_inicio')=0,'ALTER TABLE `patients` ADD COLUMN `tratamento_inicio` DATE NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='tratamento_fim')=0,'ALTER TABLE `patients` ADD COLUMN `tratamento_fim` DATE NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ============================================================================
-- A PARTIR DAQUI O APP USA ISSO (executado pelo backend, nao precisa rodar):
-- o login do responsável passa a checar status e validade.
-- ============================================================================
