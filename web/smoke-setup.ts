/** Prepara um ambiente de navegador mínimo para o teste de renderização. */
const memoria: Record<string, string> = {};

const ls = {
  getItem: (k: string) => (k in memoria ? memoria[k] : null),
  setItem: (k: string, v: string) => { memoria[k] = String(v); },
  removeItem: (k: string) => { delete memoria[k]; },
  clear: () => { Object.keys(memoria).forEach((k) => delete memoria[k]); },
};

(globalThis as any).localStorage = ls;

if (!(globalThis as any).window) (globalThis as any).window = globalThis;
if (!(globalThis as any).navigator) (globalThis as any).navigator = { language: 'pt-BR' };
if (!(globalThis as any).matchMedia) {
  (globalThis as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
}
if (!(globalThis as any).speechSynthesis) (globalThis as any).speechSynthesis = { cancel() {}, speak() {}, getVoices: () => [] };

// esbuild pode compilar JSX no modo clássico (React.createElement)
import React from 'react';
(globalThis as any).React = React;

if (!(globalThis as any).document) {
  (globalThis as any).document = {
    addEventListener() {}, removeEventListener() {},
    documentElement: { setAttribute() {}, getAttribute: () => null },
    body: { classList: { add() {}, remove() {}, toggle() {} } },
    querySelector: () => null, querySelectorAll: () => [],
  };
}

// O BrowserRouter le window.history no import: precisa existir antes.
if (!(globalThis as any).history) {
  (globalThis as any).location = {
    pathname: '/', search: '', hash: '', href: 'http://localhost/', origin: 'http://localhost',
  };
  (globalThis as any).history = {
    state: null, length: 1, scrollRestoration: 'auto',
    pushState() {}, replaceState() {}, go() {}, back() {}, forward() {},
  };
}

// O react-router pega a janela por document.defaultView.
const doc: any = (globalThis as any).document ?? {};
doc.defaultView = doc.defaultView ?? (globalThis as any).window ?? globalThis;
if (!doc.addEventListener) doc.addEventListener = () => {};
if (!doc.querySelector) doc.querySelector = () => null;
if (!doc.querySelectorAll) doc.querySelectorAll = () => [];
if (!doc.documentElement) doc.documentElement = { setAttribute() {}, getAttribute: () => null, style: {} };
if (!doc.body) doc.body = { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, style: {} };
if (!doc.createElement) doc.createElement = () => ({ setAttribute() {}, style: {}, appendChild() {}, classList: { add() {} } });
;(globalThis as any).document = doc;

export const storage = memoria;