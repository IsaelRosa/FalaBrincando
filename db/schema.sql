-- ============================================================
-- FalaBrincando — Terapia da Fala em Casa
-- Schema MySQL 8 / MariaDB 10.6+ (Hostinger)
-- ============================================================

CREATE DATABASE IF NOT EXISTS falabrincando
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE falabrincando;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------- USUÁRIOS E PERFIS ----------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('fono','responsavel') NOT NULL,
  display_name  VARCHAR(120) NOT NULL,
  phone         VARCHAR(40) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- PACIENTES (crianças) ----------
CREATE TABLE IF NOT EXISTS patients (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  owner_fono_id     INT UNSIGNED NOT NULL,          -- fonoaudióloga responsável
  nome              VARCHAR(120) NOT NULL,
  apelido           VARCHAR(60) NULL,
  birth_date        DATE NULL,
  anonymized        TINYINT(1) NOT NULL DEFAULT 1, -- dados demonstrativos
  notes_general     TEXT NULL,
  -- LGPD
  consent_at        TIMESTAMP NULL,
  consent_by        VARCHAR(160) NULL,
  voice_consent_at  TIMESTAMP NULL,                -- autorização p/ gravações
  voice_consent_by  VARCHAR(160) NULL,
  deleted_at        TIMESTAMP NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pat_fono FOREIGN KEY (owner_fono_id) REFERENCES users(id),
  INDEX idx_pat_fono (owner_fono_id, deleted_at)
) ENGINE=InnoDB;

-- Vínculo responsável ↔ paciente
CREATE TABLE IF NOT EXISTS patient_guardians (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT UNSIGNED NOT NULL,
  guardian_id  INT UNSIGNED NOT NULL,
  relation     VARCHAR(40) NULL,
  can_record   TINYINT(1) NOT NULL DEFAULT 1,   -- pode registrar atividades
  can_share    TINYINT(1) NOT NULL DEFAULT 1,   -- pode compartilhar com a fono
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_guard (patient_id, guardian_id),
  CONSTRAINT fk_pg_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_gua_usr FOREIGN KEY (guardian_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- CATÁLOGO DE JOGOS (extensível) ----------
CREATE TABLE IF NOT EXISTS game_types (
  slug        VARCHAR(40) PRIMARY KEY,     -- 'pontaria','memoria','o_que_e',...
  nome        VARCHAR(80) NOT NULL,
  descricao   VARCHAR(255) NULL,
  ativo       TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- ---------- MATERIAIS / BIBLIOTECA ----------
CREATE TABLE IF NOT EXISTS materials (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fono_id      INT UNSIGNED NULL,            -- NULL = biblioteca global da clínica
  kind         ENUM('imagem','audio','video','pdf','ficha') NOT NULL,
  title        VARCHAR(160) NOT NULL,
  description  TEXT NULL,
  file_path    VARCHAR(400) NULL,            -- caminho no storage local
  mime_type    VARCHAR(100) NULL,
  -- classificação clínica
  category     VARCHAR(60) NULL,             -- 'animais','comida',...
  phoneme_id   INT UNSIGNED NULL,
  word_position ENUM('inicial','medial','final','vogais','silabas','nucleo','coda','cluster') NULL,
  exercise_type VARCHAR(60) NULL,
  -- direitos autorais
  rights       ENUM('proprio','licenciado','autorizado') NOT NULL DEFAULT 'proprio',
  rights_note  VARCHAR(255) NULL,
  source_ref   VARCHAR(255) NULL,
  -- fluxo de aprovação da profissional
  status       ENUM('rascunho','revisao','aprovado','rejeitado') NOT NULL DEFAULT 'rascunho',
  approved_at  TIMESTAMP NULL,
  approved_by  INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mat_fono (fono_id, status),
  INDEX idx_mat_class (phoneme_id, word_position, category)
) ENGINE=InnoDB;

-- ---------- FONEMAS-ALVO ----------
CREATE TABLE IF NOT EXISTS phonemes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fono_id       INT UNSIGNED NULL,             -- NULL = modelo global clonável
  symbol        VARCHAR(20) NOT NULL,          -- 'S','Z','CH','J','R','L','LH','NH',...
  name          VARCHAR(80) NOT NULL,          -- 'S''sso' (entre aspas simples)
  kind          ENUM('consoante','grupo_consonantal','vogal','silaba','cluster') NOT NULL DEFAULT 'consoante',
  ipa           VARCHAR(30) NULL,
  sound_model   VARCHAR(255) NULL,             -- 'modelo de fala' escrito pela fono
  description   TEXT NULL,
  variation_ptbr TEXT NULL,                    -- ex.: X = /ʃ/ ou /ks/
  target_positions JSON NULL,   -- ["inicial","medial","final"]
  syllables      JSON NULL,                    -- JSON array
  combinations   JSON NULL,                    -- JSON array
  words          JSON NULL,                    -- JSON array [{word,position,syllables,image_id}]
  sentences      JSON NULL,                    -- JSON array
  texts          MEDIUMTEXT NULL,
  audio_refs     JSON NULL,                    -- JSON array de material_id
  guardian_instructions TEXT NULL,
  objectives     TEXT NULL,
  followup_criteria TEXT NULL,
  clinical_notes TEXT NULL,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_ph_fono (fono_id)
) ENGINE=InnoDB;

-- ---------- TRILHA / HIERARQUIA ----------
CREATE TABLE IF NOT EXISTS hierarchy_stages (
  slug        VARCHAR(40) PRIMARY KEY,
  ordem       INT NOT NULL,
  nome        VARCHAR(80) NOT NULL,
  descricao   VARCHAR(255) NULL,
  cor         VARCHAR(20) NULL
) ENGINE=InnoDB;

-- Plano de um fonema para um paciente: etapas selecionadas (não obrigatoriamente em ordem)
CREATE TABLE IF NOT EXISTS stage_plans (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id        INT UNSIGNED NOT NULL,
  phoneme_id        INT UNSIGNED NOT NULL,
  stage_key         VARCHAR(40) NOT NULL,
  status            ENUM('ativa','concluida','pausada','retomar') NOT NULL DEFAULT 'pausada',
  ordem_custom      INT NULL,                    -- ordem livre definida pela fono
  advancement_criteria TEXT NULL,               -- critérios clínicos p/ avançar
  fono_decision     VARCHAR(120) NULL,          -- avançar | manter | retomar
  decided_at        TIMESTAMP NULL,
  decided_by        INT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stage_plan (patient_id, phoneme_id, stage_key),
  CONSTRAINT fk_sp_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_ph  FOREIGN KEY (phoneme_id) REFERENCES phonemes(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_us  FOREIGN KEY (decided_by)  REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------- ATIVIDADES PRESCRITAS ----------
CREATE TABLE IF NOT EXISTS activity_plans (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT UNSIGNED NOT NULL,
  phoneme_id   INT UNSIGNED NULL,
  stage_key    VARCHAR(40) NULL,
  game_key     VARCHAR(40) NOT NULL,
  title        VARCHAR(160) NOT NULL,
  config       MEDIUMTEXT NULL,        -- JSON: nº tentativas, dificuldade, pares, etc.
  instructions VARCHAR(400) NULL,      -- instruções p/ o responsável
  frequency    VARCHAR(60) NULL,       -- 'Diária'
  duration_min INT NULL,
  sessions_per_day INT NOT NULL DEFAULT 1,
  active       TINYINT(1) NOT NULL DEFAULT 1,
  cloned_from  INT UNSIGNED NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_ap_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_ap_ph  FOREIGN KEY (phoneme_id) REFERENCES phonemes(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------- SESSÕES DE ATIVIDADE (execução pela criança/responsável) ----------
CREATE TABLE IF NOT EXISTS activity_sessions (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  activity_plan_id INT UNSIGNED NOT NULL,
  patient_id     INT UNSIGNED NOT NULL,
  started_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at       TIMESTAMP NULL,
  end_reason     ENUM('concluida','pausada','interrompida','abandonada') NULL,
  attempts       INT NOT NULL DEFAULT 0,
  duration_sec   INT NULL,
  observations   TEXT NULL,               -- observação do responsável
  child_feedback VARCHAR(160) NULL,       -- 'foilegal','um_pouco_difícil'
  stars          INT NOT NULL DEFAULT 0,  -- recompensa simbólica
  CONSTRAINT fk_as_ap FOREIGN KEY (activity_plan_id) REFERENCES activity_plans(id) ON DELETE CASCADE,
  CONSTRAINT fk_as_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tentativas individuais (círculos da pontaria, acertos da memória)
CREATE TABLE IF NOT EXISTS attempts (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id  INT UNSIGNED NOT NULL,
  item_ref    VARCHAR(120) NULL,      -- palavra/id do item
  result      ENUM('acerto','erro','nao_avaliado') NOT NULL DEFAULT 'nao_avaliado',
  position    INT NULL,               -- círculo na ficha
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_at_ses FOREIGN KEY (session_id) REFERENCES activity_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Observações/registros clínicos da fono
CREATE TABLE IF NOT EXISTS clinical_notes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id  INT UNSIGNED NOT NULL,
  fono_id     INT UNSIGNED NOT NULL,
  body        TEXT NOT NULL,
  note_date   DATE NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cn_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_cn_usr FOREIGN KEY (fono_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- Recompensas simbólicas
CREATE TABLE IF NOT EXISTS rewards (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  label     VARCHAR(80) NOT NULL,
  emoji     VARCHAR(16) NOT NULL DEFAULT '⭐',
  icon      VARCHAR(60) NULL,
  earned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rw_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- trilha de generalização / situações reais
CREATE TABLE IF NOT EXISTS generalization_items (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT UNSIGNED NOT NULL,
  phoneme_id INT UNSIGNED NULL,
  contexto   VARCHAR(120) NOT NULL,   -- 'na loja','no almoço'
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gi_pat FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------- CATÁLOGOS BASE ----------
INSERT IGNORE INTO hierarchy_stages (slug, ordem, nome, descricao, cor) VALUES
 ('fonema_isolado', 1, 'Fonema isolado', 'Produzir o som isolado, com apoio visual e auditivo.', '#E63946'),
 ('silabas', 2, 'Sílabas', 'Combinar o fonema com vogais em sílabas (LA, LE, LI...).', '#F3722C'),
 ('palavras', 3, 'Palavras', 'Aplicar o fonema em palavras, por posição (inicial, medial, final).', '#F6A01A'),
 ('frases', 4, 'Frases', 'Produzir frases e orações curtas com o fonema-alvo.', '#7FB069'),
 ('leitura_voz_alta', 5, 'Leitura em voz alta', 'Ler fichas e textos em voz alta com o fonema.', '#4D96FF'),
 ('conversa_estruturada', 6, 'Conversa estruturada', 'Participar de diálogos com roteiro combinado.', '#9B5DE5'),
 ('generalizacao', 7, 'Generalização', 'Usar o som em situações reais do dia a dia.', '#00BBF9');

INSERT IGNORE INTO game_types (slug, nome, descricao, sort_order) VALUES
 ('pontaria', 'Jogo da Pontaria', 'Figura + palavra-alvo com círculos para registrar tentativas.', 1),
 ('memoria', 'Jogo da Memória', 'Cartas com imagens e palavras do fonema, níveis configuráveis.', 2),
 ('o_que_e', 'O que é? O que é?', 'Nomear objetos, identificar sons e responder perguntas.', 3),
 ('intruso', 'Encontre o Intruso', 'Identificar o elemento que não pertence à categoria.', 4),
 ('album', 'Álbum de Figuras', 'Imagens com áudio, nome escrito e repetir demonstração.', 5),
 ('vogais_silabas', 'Ficha de Vogais e Sílabas', 'Leitura e reconhecimento de combinações.', 6),
 ('historias', 'Histórias Falantes', 'Cenas ilustradas para frases e conversação.', 7),
 ('instalacao', 'Instalação do Fonema', 'Sequências e modelos de fala definidos pela fono.', 8);