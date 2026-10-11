-- ============================================================
-- FalaBrincando — Entradas de biblioteca para Intruso e Álbum
-- (completam o catálogo de jogos para o indicador por habilidade).
-- ============================================================

INSERT IGNORE INTO activity_library
 (id, fono_id, game_key, title, habilidade, descricao, objetivo, materiais, passos,
  modelo_fala, tempo_min, idade_min, idade_max, nivel, criterios, adaptacoes, orientacoes, config, phoneme_id, tags)
VALUES
(24, NULL,'intruso','Encontre o Intruso — L','consciencia_fonologica',
 'Identificar o elemento que não pertence ao grupo.',
 'Discriminar elementos que não pertencem a uma categoria.',
 '["Figuras do grupo","Uma figura intrusa"]',
 '["Mostre o grupo","Pergunte o que combina","A criança aponta o intruso","Explique o porquê em voz alta"]',
 NULL, 8, 4, 10, '1',
 'Identifica o intruso em 4 de 5 rodadas.',
 'Reduza para 3 figuras se a tarefa ficar difícil.',
 'Peça o porquê. Errar o intruso faz parte do jogo.',
 '{"group":["bola","leite","elefante"],"intruso":"chave","goal":"categoria"}', NULL,
 '["categoria","discriminacao"]'),

(25, NULL,'album','Álbum de Figuras — S','articulacao',
 'Folhear o álbum, ouvir o nome e repetir.',
 'Nomear figuras do som-alvo com apoio visual.',
 '["Álbum impresso ou figuras na tela"]',
 '["Toque na figura","A criança repete a palavra","Avance para a próxima figura"]',
 NULL, 8, 3, 8, '1',
 'Nomeia 6 das figuras do álbum.',
 'Use apenas 4 figuras se a atenção for curta.',
 'Repita com tranquilidade. Não corrija.',
 '{"words":["sol","sapo","asa","mesa"]}', NULL,
 '["album","nomear"]');