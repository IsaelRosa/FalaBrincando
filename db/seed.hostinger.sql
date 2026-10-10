-- ============================================================
-- FalaBrincando — Dados de demonstracao (100% FICTICIOS)
-- Importe DEPOIS do schema, com o mesmo banco selecionado.
-- Opcional: apague estas linhas para um banco de producao vazio.
-- ============================================================
-- ============================================================
-- FalaBrincando — SEED (dados 100% fictícios)
-- ============================================================

INSERT IGNORE INTO users (id, email, password_hash, role, display_name, phone) VALUES
 (1,'demo@falabrincando.app','$2b$10$DZyDQUlNePIY3PBQQu8CZeWzYdODHVM0t2Tqi2k9L0z2uQfH5sDu.','fono','Dra. Demonstração (fictícia)','(11) 90000-0000'),
 (2,'responsavel@falabrincando.app','$2b$10$DZyDQUlNePIY3PBQQu8CZeWzYdODHVM0t2Tqi2k9L0z2uQfH5sDu.','responsavel','Responsável Demonstração','(11) 90000-0001');

INSERT IGNORE INTO patients (id, owner_fono_id, nome, apelido, birth_date, anonymized, notes_general, consent_at, consent_by, voice_consent_at, voice_consent_by) VALUES
 (1,1,'Criança Demonstração Alfa','Alfa','2019-04-12',1,'Dados fictícios para demonstração. Fonema-alvo S.', NOW(),'Responsável Demonstração', NULL, NULL),
 (2,1,'Criança Demonstração Beta','Beta','2018-09-30',1,'Dados fictícios para demonstração. Fonema-alvo R e L.', NOW(),'Responsável Demonstração', NULL, NULL);

INSERT IGNORE INTO patient_guardians (patient_id, guardian_id, relation) VALUES
 (1,2,'Mãe'), (2,2,'Mãe');

-- Fonemas-alvo (modelos globais clonáveis pela profissional)
INSERT IGNORE INTO phonemes (id, fono_id, symbol, name, kind, ipa, sound_model, description, variation_ptbr, target_positions, syllables, combinations, words, sentences, guardian_instructions, objectives, followup_criteria) VALUES
 (1,NULL,'S','''sso''','consoante','/s/','Sopro contínuo fino entre os dentes, como o barulho do vento.',
  'Produção do som /s/ nas três posições da palavra.',
  'Em português brasileiro o S inicial e medial são geralmente /s/; o S final pode realizar-se como /s/ ou, em alguns dialetos, /z/ — considerar a variação.',
  '["inicial","medial","final"]',
  '["sa","se","si","so","su","za","ze","zi","zo","zu"]',
  '["sa-se","se-ta","za-bola","so-fá"]',
  '[{"word":"sol","position":"inicial","syllables":["sol"]},{"word":"casa","position":"final","syllables":["ca","sa"]},{"word":"mesa","position":"medial","syllables":["me","sa"]},{"word":"sapo","position":"inicial","syllables":["sa","po"]},{"word":"asa","position":"inicial","syllables":["a","sa"]},{"word":"passaro","position":"inicial","syllables":["pas","sa","ro"]},{"word":"zebra","position":"inicial","syllables":["ze","bra"]},{"word":"gelo","position":"inicial","syllables":["ge","lo"]},{"word":"cozinha","position":"inicial","syllables":["co","zi","nha"]}]',
  '["O sol está quente.","A casa é grande.","A mesa tem uma cadeira.","O sapo pula alto."]',
  'Sente-se ao lado da criança e produza o som junto. Repita a palavra devagar. Não peça correção: se o som sair diferente, apenas repita o modelo com carinho.',
  'Produzir /s/ isolado e em sílabas, palavras, frases e leitura.',
  'Avançar quando produzir 8 de 10 tentativas com apenas o modelo adulto, em duas sessões distintas.'),

 (2,NULL,'R','''r''','consoante','/ʁ/','Arredondar os lábios e puxar a língua de leve para trás, sem tocar o céu da boca.',
  'Produção do /ʁ/ (RSAMPA) pós-vocálico.',
  'O R inicial (arara) e medial (carro) formam grupo /h/ + /ʁ/ no português brasileiro; o R final (cor) é produzido com a língua abaulada e sons ordenados.',
  '["inicial","medial","final"]',
  '["ra","re","ri","ro","ru","ra-da","ca-ro"]',
  '["sa-que","ca-ro","pa-rte"]',
  '[{"word":"arara","position":"inicial","syllables":["a","ra","ra"]},{"word":"carro","position":"medial","syllables":["ca","rro"]},{"word":"cor","position":"final","syllables":["cor"]},{"word":"rato","position":"inicial","syllables":["ra","to"]},{"word":"girafa","position":"inicial","syllables":["gi","ra","fa"]}]',
  '["O arara é colorido.","O carro é vermelho.","A girafa tem pescoço longo."]',
  'Mantenha a boca arredondada. Vença o som sem pressa. Se a criança parar de falar por esforço, pare e descanse.',
  'Produzir /ʁ/ com dados do R forte (consoante) e /h/ em R inicial.',
  'Avançar com 80% de produção espontânea, sem apoio de espelho.'),

 (3,NULL,'L','''l''','consoante','/l/','Encostar a ponta da língua no céu da boca e soprar o ar pelos lados.',
  'Produção do /l/ lateral.',
  'Em posição final de sílaba pré-vocálica, o /l/ pode se realizar como /w/ (ex.: "salto" ~ "sauto").',
  '["inicial","medial","final"]',
  '["la","le","li","lo","lu","fla","ple"]',
  '["a-la","e-le","clo-no"]',
  '[{"word":"lua","position":"inicial","syllables":["lu","a"]},{"word":"bola","position":"medial","syllables":["bo","la"]},{"word":"leite","position":"inicial","syllables":["lei","te"]},{"word":"elefante","position":"medial","syllables":["e","le","fan","te"]}]',
  '["A lua está no céu.","A bola é redonda.","O leite é branco."]',
  'Sopre pelo canto da boca. Use o espelho para ver a ponta da língua. Repita com tranquilidade.',
  'Produzir /l/ isolado, em sílabas, palavras e frases.',
  'Avançar quando houver produção correta em 8 de 10 itens de palavras.'),

 (4,NULL,'X','X','grupo_consonantal','/ʃ/','Como um "sh" bem soprado, com os dentes próximos.',
  'Som do X português, com variação.',
  'Em português brasileiro X pode ser /ʃ/ (chave), /ks/ (exato), /z/ (zebra) ou /ʁ/ (matrix). Avaliar conforme a palavra-alvo definida pela fono.',
  '["inicial","medial","final"]',
  '["xa","xe","xi","xo","xu"]',
  '["cha-ve","a-xu"]',
  '[{"word":"chave","position":"inicial","syllables":["cha","ve"]},{"word":"saxofone","position":"medial","syllables":["sa","xo","fo","ne"]},{"word":"taxi","position":"medial","syllables":["ta","xi"]}]',
  '["A chave está na mesa.","O taxi é amarelo."]',
  'Escute primeiro, repita depois. Não force se houver confusão com CH.',
  'Distinguir o som do X conforme a palavra-alvo definida.',
  'Avaliar conforme palavra-alvo; não generalizar.'),

 (5,NULL,'LH','LH','grupo_consonantal','/ʎ/','Som parecido com L I junto, com a língua encostada no céu da boca.',
  'Digrafo LH do português.',
  'Em alguns dialetos do português brasileiro o /ʎ/ aproxima-se de /ʝ/.',
  '["inicial","medial"]',
  '["lha","lhe","lhi","lho","lhu"]',
  '["i-lha","mi-lho"]',
  '[{"word":"ilha","position":"inicial","syllables":["i","lha"]},{"word":"filho","position":"medial","syllables":["fi","lho"]},{"word":"coelho","position":"medial","syllables":["co","e","lho"]}]',
  '["A ilha é pequena.","Meu filho é alto."]',
  'Repita com calma. O som já existe em LI/LI; apenas junte.',
  'Produzir /ʎ/ e generalizar para NH.',
  'Avançar quando distinguir LH de LI.');

-- Palavras extras do fonema S (inicial e medial) — incluídas no cadastro acima.

-- Planos de etapa (personalizados — não seguem a ordem padrão para todos)
INSERT IGNORE INTO stage_plans (patient_id, phoneme_id, stage_key, status, ordem_custom, advancement_criteria, fono_decision, decided_at, decided_by) VALUES
 (1,1,'fonema_isolado','ativa',1,'Produzir /s/ isolado 8/10 com modelo adulto.',NULL,NULL,NULL),
 (1,1,'silabas','ativa',2,'Sequências SA-SE-SI-SO-SU com apoio do modelo adulto.',NULL,NULL,NULL),
 (1,1,'palavras','pausada',3,'6 palavras em 8/10 tentativas.',NULL,NULL,NULL),
 (1,2,'fonema_isolado','pausada',1,'Produção de /ʁ/ com apoio visual.',NULL,NULL,NULL),
 (1,2,'palavras','pausada',2,'Palavras com R inicial.',NULL,NULL,NULL),
 (2,3,'fonema_isolado','ativa',1,'Produzir /l/ isolado.',NULL,NULL,NULL),
 (2,3,'palavras','pausada',2,'Palavras com L medial.',NULL,NULL,NULL);

-- Atividades prescritas (exemplos)
INSERT IGNORE INTO activity_plans (patient_id, phoneme_id, stage_key, game_key, title, config, instructions, frequency, duration_min, sessions_per_day) VALUES
 (1,1,'fonema_isolado','pontaria','Pontaria do som S','{"attempts":10,"cards":["sol","sapo","asa"]}','Mostre a figura e repita a palavra 10 vezes. Registre cada tentativa com um círculo.','Diária',10,1),
 (1,1,'palavras','memoria','Memória das palavras com S','{"pairs":6,"difficulty":"facil"}','Jogue com 6 pares. Fale o nome de cada figura ao revelar.','Diária',10,1),
 (1,1,'palavras','o_que_e','O que é? O que é?','{"questions":[{"q":"O que começa com S?","a":"sol"},{"q":"Onde fica o sapo?","a":"no lago"}]}','Aperte a figura e diga o nome em voz alta.','3x por semana',8,1),
 (1,1,'silabas','vogais_silabas','Ficha de sílabas LA-SE-SI','{"syllables":["sa","se","si","so","su"]}','Leia as sílabas junto com a criança, alternando.','Diária',10,1),
 (1,2,'fonema_isolado','instalacao','Instalação do R — sequência 1','{"sequence":[{"step":"1","modelo":"arredondar lábios","ref":"video:modelo-r"}]}','Siga a sequência cadastrada pela fono. Sem geração automática.',NULL,12,1),
 (2,3,'palavras','intruso','Encontre o Intruso — L','{"group":["bola","leite","elefante"],"intruso":"chave","goal":"fonema"}','A criança escolhe o elemento que não pertence.',NULL,8,1);

-- Recompensas simbólicas e observações iniciais
INSERT IGNORE INTO rewards (patient_id, label, emoji) VALUES
 (1,'5 missões completas','⭐'),(1,'Sequência de 3 dias','🏅'),(2,'Primeira missão','🌟');

INSERT IGNORE INTO clinical_notes (patient_id, fono_id, body, note_date) VALUES
 (1,1,'Demonstração: plano inicial com S em fonema isolado e sílabas. Reavaliar em 15 dias.', CURDATE()),
 (2,1,'Demonstração: iniciar L em fonema isolado. Observar a produção espontânea.', CURDATE());
