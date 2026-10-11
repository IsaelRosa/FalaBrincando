/**
 * Smoke test de renderização.
 *
 * Monta o App inteiro (com BrowserRouter) para cada rota e garante que não há
 * erro de runtime — foi assim que encontramos o bug de useAuth() fora do
 * AuthProvider.
 *
 *   npx tsx smoke-app.tsx
 */
import './smoke-setup';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { BrowserRouter } from 'react-router-dom';
import App from './src/App';
import { Landing } from './src/pages/Landing';
import { CriarConta } from './src/pages/CriarConta';

(globalThis as any).React = React;

function irPara(rota: string) {
  const w = globalThis as any;
  w.location.pathname = rota;
  w.location.href = `http://localhost${rota}`;
}

let falhas = 0;
const ok = (msg: string) => { console.log(`✅ ${msg}`); };
const falha = (msg: string) => { console.log(`❌ ${msg}`); falhas++; };

// 1) O App inteiro não pode quebrar em nenhuma rota
const rotas = ['/', '/criar-conta', '/entrar', '/inicio', '/fono', '/fono/biblioteca', '/jogo/1'];
for (const rota of rotas) {
  try {
    irPara(rota);
    const html = renderToString(<App />);
    if (html.length > 50) ok(`App monta em ${rota}`);
    else falha(`App montou vazio em ${rota}`);
  } catch (e: any) {
    falha(`App quebrou em ${rota} -> ${e.message}`);
    console.log((e.stack ?? '').split('\n').slice(0, 3).join('\n'));
  }
}

// 2) As telas públicas precisam renderizar o conteúdo
try {
  const l = renderToString(<BrowserRouter><Landing /></BrowserRouter>);
  l.includes('FalaBrincando') && l.includes('Criar conta')
    ? ok('Landing renderiza com título e botão de cadastro')
    : falha('Landing sem conteúdo esperado');
} catch (e: any) { falha(`Landing quebrou -> ${e.message}`); }

try {
  const c = renderToString(<BrowserRouter><CriarConta /></BrowserRouter>);
  c.includes('Criar conta') && c.includes('Sou responsável')
    ? ok('CriarConta renderiza com os dois perfis')
    : falha('CriarConta sem formulário esperado');
} catch (e: any) { falha(`CriarConta quebrou -> ${e.message}`); }

console.log(falhas ? `\n❌ ${falhas} falha(s)` : '\n✅ Tudo certo: App e telas públicas renderizam sem erro');
process.exit(falhas ? 1 : 0);