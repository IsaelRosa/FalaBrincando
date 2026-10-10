# Guia de publicação na Hostinger

O FalaBrincando usa **um único processo Node.js** que serve a API e a interface na mesma porta.
Na Hostinger isso corresponde ao plano com **hospedagem Node.js** + **MySQL**.

---

## 1. Banco de dados MySQL

No hPanel:

1. **Bancos de Dados MySQL** → *Criar novo banco* (ex.: `u123456_falabrincando`).
2. Crie um usuário MySQL e anote **host, usuário, senha e porta** (a porta costuma ser `3306`).
3. Guarde esses dados para o passo 3.

Para criar as tabelas, use **phpMyAdmin → Importar** com:

- `db/schema.sql`
- `db/seed.sql` *(opcional — só para a demonstração)*

Alternativamente, no terminal da aplicação:

```bash
DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=... npm run db:seed
```

---

## 2. Enviar o código

```bash
git clone https://github.com/IsaelRosa/FalaBrincando.git
cd FalaBrincando
```

Envie a pasta inteira para a Hostinger por **Git** (hPanel → *Sites → Git*) ou por **FTP/SFTP**.

---

## 3. Configurar a aplicação

No hPanel → **Site Node.js → Configurações**:

| Campo | Valor |
| --- | --- |
| Versão do Node | 20 ou superior |
| Modo | Production |
| Script de start | `node dist/index.js` |
| Raiz da aplicação | pasta do projeto |

### Variáveis de ambiente

| Variável | Valor |
| --- | --- |
| `PORT` | porta definida pelo hPanel (ex.: `3000`) |
| `NODE_ENV` | `production` |
| `DB_HOST` | host do MySQL do hPanel |
| `DB_PORT` | `3306` |
| `DB_USER` | usuário do banco |
| `DB_PASSWORD` | senha do banco |
| `DB_NAME` | nome do banco |
| `JWT_SECRET` | string longa e aleatória (ex.: saída de `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://seudominio.com` |
| `UPLOAD_DIR` | `./storage` |
| `UPLOAD_MAX_MB` | `25` |

Gere um segredo forte:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Build

```bash
npm install
cd web && npm install && npm run build && cd ..
npm run build
```

A estrutura final esperada:

```
FalaBrincando/
├─ dist/        # API compilada
├─ web/dist/    # interface compilada
├─ src/
├─ db/
└─ storage/     # precisa ter permissão de escrita
```

Garanta permissão de escrita:

```bash
chmod -R 755 storage
```

O servidor procura a interface em `web/dist` e a serve automaticamente (fallback de rotas SPA).
Se a sua instalação usar outro caminho, defina `WEB_DIST=/caminho/absoluto/web/dist`.

---

## 5. Checklist de verificação

Depois do deploy:

- [ ] `https://seudominio.com/api/health` retorna `{"ok":true,...}`
- [ ] A tela de login abre e o mascot aparece
- [ ] `demo@falabrincando.app` / `falabrincando123` entra no painel profissional
- [ ] `responsavel@falabrincando.app` / `falabrincando123` entra na tela infantil
- [ ] A importação de materiais grava em `storage/`

> ⚠️ **Remova os usuários de demonstração** antes de usar com pacientes reais:
> ```sql
> DELETE FROM users WHERE email IN
>   ('demo@falabrincando.app','responsavel@falabrincando.app');
> ```

---

## 6. Se o seu plano for hospedagem estática (sem Node.js)

Nesse caso o front pode ir em `public_html`, mas a API precisa de outro lugar:

1. Publique `web/dist` em `public_html`.
2. Suba a API em um serviço Node (Railway, Render, Fly.io, Vercel Functions).
3. No `web/dist`, ajuste o proxy para apontar à URL da API:

```js
// vite.config.ts — build de produção
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'dist' },
});
```

E no cliente (`web/src/lib/api.ts`), use `const API = 'https://sua-api.com/api'`.

---

## 7. Checklist de LGPD antes do uso real

- [ ] Colete o **consentimento do responsável** (registrado em `patients.consent_at`)
- [ ] Obtenha **autorização específica para gravações de voz** (`voice_consent_at`) — a gravação em si ainda não está implementada
- [ ] Troque o `JWT_SECRET`
- [ ] Remova os dados de demonstração
- [ ] Defina `CORS_ORIGIN` restrito ao seu domínio
- [ ] Verifique a necessidade de Adequação/Relatório de Impacto à Proteção de Dados (ANPD)
- [ ] Tenha um meio de exclusão de dados a pedido dos titulares