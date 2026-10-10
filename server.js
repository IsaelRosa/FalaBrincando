/**
 * Ponto de entrada único do FalaBrincando.
 *
 * A Hostinger exige um entrypoint chamado `server.js` na raiz do projeto.
 * Este arquivo inicia a aplicação compilada em dist/index.js, que por sua vez
 * serve a API (/api) e a interface (web/dist) na mesma porta.
 */
import './dist/index.js';