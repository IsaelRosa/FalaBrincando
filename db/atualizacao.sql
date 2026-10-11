-- FalaBrincando - ATUALIZACAO DO BANCO (colar na aba SQL do phpMyAdmin)
-- Banco: u315093330_FalaBrincando (ja selecionado no topo)
-- Pode rodar varias vezes: e idempotente.

-- ============ 1) Tabela da biblioteca de atividades ============
CREATE TABLE IF NOT EXISTS activity_library (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fono_id INT UNSIGNED NULL,
  game_key VARCHAR(40) NOT NULL,
  title VARCHAR(160) NOT NULL,
  habilidade VARCHAR(40) NOT NULL,
  descricao TEXT NULL,
  objetivo TEXT NULL,
  materiais JSON NULL,
  passos JSON NULL,
  modelo_fala TEXT NULL,
  tempo_min INT NOT NULL DEFAULT 10,
  idade_min INT NOT NULL DEFAULT 3,
  idade_max INT NOT NULL DEFAULT 12,
  nivel VARCHAR(20) NOT NULL DEFAULT '1',
  criterios TEXT NULL,
  adaptacoes TEXT NULL,
  orientacoes TEXT NULL,
  config MEDIUMTEXT NULL,
  phoneme_id INT UNSIGNED NULL,
  tags JSON NULL,
  status ENUM('rascunho','aprovado') NOT NULL DEFAULT 'aprovado',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_lib_hab (habilidade, idade_min, idade_max, nivel)
) ENGINE=InnoDB;

-- ============ 2) Tabela de gravacoes de voz ============
CREATE TABLE IF NOT EXISTS recordings (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  activity_id INT UNSIGNED NULL,
  uploaded_by INT UNSIGNED NOT NULL,
  file_path VARCHAR(400) NOT NULL,
  mime_type VARCHAR(60) NOT NULL DEFAULT 'audio/webm',
  duracao_sec INT NULL,
  label VARCHAR(120) NULL,
  status ENUM('pendente','revisto') NOT NULL DEFAULT 'pendente',
  reviewed_at TIMESTAMP NULL,
  reviewed_by INT UNSIGNED NULL,
  observacao TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_grav_pat (patient_id, created_at),
  CONSTRAINT fk_grav_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_grav_usr FOREIGN KEY (uploaded_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ============ 3) Colunas novas em patients ============
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='avatar')=0,'ALTER TABLE `patients` ADD COLUMN `avatar` VARCHAR(80) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='tipo_comunicacao')=0,'ALTER TABLE `patients` ADD COLUMN `tipo_comunicacao` VARCHAR(40) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='necessidades')=0,'ALTER TABLE `patients` ADD COLUMN `necessidades` JSON NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='preferencias')=0,'ALTER TABLE `patients` ADD COLUMN `preferencias` JSON NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='acessibilidade')=0,'ALTER TABLE `patients` ADD COLUMN `acessibilidade` JSON NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='observacoes_resp')=0,'ALTER TABLE `patients` ADD COLUMN `observacoes_resp` TEXT NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='metas')=0,'ALTER TABLE `patients` ADD COLUMN `metas` JSON NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='lembrete_ativo')=0,'ALTER TABLE `patients` ADD COLUMN `lembrete_ativo` TINYINT(1) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='lembrete_hora')=0,'ALTER TABLE `patients` ADD COLUMN `lembrete_hora` VARCHAR(5) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='lembrete_dias')=0,'ALTER TABLE `patients` ADD COLUMN `lembrete_dias` VARCHAR(60) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='patients' AND COLUMN_NAME='lembrete_texto')=0,'ALTER TABLE `patients` ADD COLUMN `lembrete_texto` VARCHAR(200) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ============ 4) Colunas novas em activity_plans ============
SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='library_id')=0,'ALTER TABLE `activity_plans` ADD COLUMN `library_id` INT UNSIGNED NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='objetivo')=0,'ALTER TABLE `activity_plans` ADD COLUMN `objetivo` TEXT NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='habilidade')=0,'ALTER TABLE `activity_plans` ADD COLUMN `habilidade` VARCHAR(40) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='materiais')=0,'ALTER TABLE `activity_plans` ADD COLUMN `materiais` JSON NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='passos')=0,'ALTER TABLE `activity_plans` ADD COLUMN `passos` JSON NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='modelo_fala')=0,'ALTER TABLE `activity_plans` ADD COLUMN `modelo_fala` TEXT NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='nivel')=0,'ALTER TABLE `activity_plans` ADD COLUMN `nivel` VARCHAR(20) NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='criterios')=0,'ALTER TABLE `activity_plans` ADD COLUMN `criterios` TEXT NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='adaptacoes')=0,'ALTER TABLE `activity_plans` ADD COLUMN `adaptacoes` TEXT NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @s = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='activity_plans' AND COLUMN_NAME='orientacoes')=0,'ALTER TABLE `activity_plans` ADD COLUMN `orientacoes` TEXT NULL','DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ============ 5) Tipos de jogo novos ============
INSERT IGNORE INTO game_types (slug,nome,descricao,sort_order) VALUES
('caca_sons','Caca aos Sons','Encontrar figuras com determinado som.',9),
('mundo_animais','Mundo dos Animais','Identificar animais e seus sons.',10),
('monte_palavra','Monte a Palavra','Associar imagens, silabas e palavras.',11),
('qual_figura','Qual e a Figura?','Identificar objetos a partir de pistas.',12),
('roleta','Roleta das Palavras','Sortear palavras ou imagens para praticar.',13),
('missoes','Missoes da Comunicacao','Resolver situacoes cotidianas.',14),
('trilha','Trilha da Aventura','Avancar em etapas ao realizar atividades.',15),
('historia_interativa','Historia Interativa','Completar historias e responder perguntas.',16);

-- ============ 6) Classifica as atividades antigas por habilidade ============
UPDATE activity_plans a
JOIN (SELECT game_key, MIN(habilidade) AS hab FROM activity_library GROUP BY game_key) l
  ON l.game_key = a.game_key
SET a.habilidade = l.hab
WHERE a.habilidade IS NULL;