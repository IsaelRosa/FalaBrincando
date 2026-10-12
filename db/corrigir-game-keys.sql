-- =====================================================================
-- FalaBrincando - CORREÇÃO de atividades com game_key inválida
--
-- Sintoma: ao escolher um jogo, o sistema gravou o NOME do jogo
-- (ex.: "Jogo da Memória") em vez da chave (ex.: "memoria").
-- Depois disso a atividade não abre, com a mensagem
-- "Jogo ... ainda não implementado nesta versão".
--
-- Este script religa cada atividade ao jogo correto pelo nome.
-- Seguro para rodar várias vezes.
-- =====================================================================

-- 1) mostra o estado atual
SELECT
  COALESCE(g.slug, '(desconhecido)') AS jogo,
  COUNT(*) AS atividades_afetadas
FROM activity_plans a
LEFT JOIN game_types g ON g.nome = a.game_key
WHERE g.slug IS NULL OR a.game_key <> g.slug
GROUP BY g.slug;

-- 2) corrige
UPDATE activity_plans a
JOIN game_types g ON g.nome = a.game_key
SET a.game_key = g.slug
WHERE a.game_key <> g.slug;

-- 3) activities sem correspondência (jogo removido do catálogo)
SELECT id, title, game_key
FROM activity_plans
WHERE game_key NOT IN (SELECT slug FROM game_types);

-- 4) confere o resultado
SELECT game_key, COUNT(*) AS total
FROM activity_plans
GROUP BY game_key
ORDER BY game_key;