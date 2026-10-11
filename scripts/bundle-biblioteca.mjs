/**
 * Gera db/biblioteca-completa.sql reunindo os três arquivos de biblioteca.
 *   node scripts/bundle-biblioteca.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const raiz = process.cwd();
const origem = ['library.seed.sql', 'library.fase3.sql', 'library.complemento.sql'];

const cabecalho = `-- =====================================================================
-- FalaBrincando - BIBLIOTECA COMPLETA DE ATIVIDADES (25 atividades)
-- Todas as habilidades, em arquivo unico.
--
-- IMPORTACAO (phpMyAdmin):
--   1. Rode antes:  npm run db:migrate   (cria a tabela activity_library)
--   2. Selecione seu banco no topo do phpMyAdmin
--   3. Aba Importar > envie este arquivo > Executar
--
-- Seguro para reimportar: usa INSERT IGNORE (nao duplica).
-- Dados 100% ficticios, apenas para demonstracao.
-- A fonoaudióloga revisa e adapta antes de usar com pacientes.
-- =====================================================================

`;

const corpo = origem
  .map((f) => fs.readFileSync(path.join(raiz, 'db', f), 'utf8').trim())
  .join('\n\n');

fs.writeFileSync(path.join(raiz, 'db', 'biblioteca-completa.sql'), cabecalho + corpo + '\n', 'utf8');
console.log('db/biblioteca-completa.sql gerado');