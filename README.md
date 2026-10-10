# FalaBrincando — Terapia da Fala em Casa

Aplicativo web responsivo de apoio à prática domiciliar de exercícios de **fala e articulação
infantil**, com acompanhamento profissional da fonoaudióloga.

> **FalaBrincando é uma ferramenta complementar e nunca um substituto da terapia.**
> O sistema **não gera conteúdo clínico automaticamente**, **não classifica a pronúncia** da criança
> e **não produz diagnósticos**. Todo conteúdo, critério e decisão é cadastrado e revisado pela
> fonoaudióloga.

---

## 1. O que está pronto

| Módulo | Situação |
| --- | --- |
| Trilha da articulação em escada (7 etapas) | ✅ com seleção livre de etapas, ordem personalizada e decisão clínica (avançar / manter / retomar) |
| Cadastro de fonemas (S, Z, CH, J, R, L, X, LH, NH…) | ✅ com som/modelo de fala, posições, sílabas, combinações, palavras, frases, textos, instruções ao responsável, objetivos e critérios |
| Jogo da Pontaria | ✅ |
| Jogo da Memória | ✅ com dificuldade configurável |
| O que é? O que é? | ✅ perguntas pré-cadastradas |
| Encontre o Intruso | ✅ |
| Álbum de Figuras | ✅ com repetição da demonstração |
| Ficha de Vogais e Sílabas | ✅ |
| Histórias Falantes | ✅ |
| Instalação do Fonema | ✅ sequência inserida pela fono — sem geração automática |
| Painel da fonoaudióloga | ✅ pacientes, fonemas, planos, atividades, materiais, relatórios |
| Painel do responsável + tela infantil | ✅ "Minha missão de hoje", sem penalidade para interrupção |
| Importação de materiais (PDF/imagem/áudio/vídeo) | ✅ com direitos, filtro por categoria/fonema/posição/exercício e aprovação antes de liberar |
| Relatórios | ✅ separam frequência, registros do responsável e evolução clínica; exporta em PDF (imprimir) |
| Controle de acesso por perfil | ✅ JWT + verificação de vínculo por paciente |
| Dados demonstrativos fictícios | ✅ |

---

## 2. Como rodar localmente

### Pré-requisitos
- Node.js 20+
- MySQL 8 (ou use o Docker Compose incluído)

### Passo a passo

```bash
# 1. Banco (opcional se já tiver MySQL)
docker compose up -d

# 2. Configuração
cp .env.example .env      # Windows: copy .env.example .env
#    Edite DB_USER, DB_PASSWORD e JWT_SECRET

# 3. Criar tabelas e dados de demonstração
npm install
npm run db:seed

# 4. Subir a API
npm run dev               # http://localhost:3333

# 5. Em outro terminal, subir a interface
cd web
npm install
npm run dev               # http://localhost:5173
```

A interface em desenvolvimento faz proxy de `/api` para `http://localhost:3333`.

### Logins de demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Fonoaudióloga | `demo@falabrincando.app` | `falabrincando123` |
| Responsável | `responsavel@falabrincando.app` | `falabrincando123` |

Os dados são **100% fictícios**.

### Build de produção (um único processo Node)

```bash
cd web && npm run build      # gera web/dist
cd .. && npm run build      # gera dist/ (API)
node dist/index.js           # serve API + SPA na mesma porta
```

---

## 3. Estrutura do projeto

```
falabrincando/
├─ db/
│  ├─ schema.sql          # tabelas, RLS lógica por owner, catálogos de etapas e jogos
│  └─ seed.sql            # dados fictícios de demonstração
├─ src/                   # API Express + TypeScript
│  ├─ index.ts            # servidor + SPA estática
│  ├─ auth.ts             # JWT e controle de acesso por perfil/paciente
│  ├─ db.ts               # pool MySQL
│  └─ routes/             # auth, patients, phonemes, sessions, materials, catalog
├─ scripts/seed.ts        # cria o banco e aplica o seed
├─ web/                   # React + TypeScript + Vite
│  └─ src/
│     ├─ games/           # registro de jogos (GAME_REGISTRY)
│     ├─ pages/           # painel fono, painel responsável, telas dos jogos
│     ├─ components/      # mascote, narração, ajustes
│     └─ lib/             # cliente HTTP e narração
└─ docker-compose.yml     # MySQL 8 para desenvolvimento
```

---

## 4. Como adicionar um novo jogo (sem reescrever o app)

1. **Backend:** insira a linha em `game_types` (`db/schema.sql` ou um `INSERT`).
2. **Frontend:** crie o componente do jogo em `web/src/games/index.tsx` e registre-o em
   `GAME_REGISTRY`:

```tsx
export const GAME_REGISTRY: Record<string, GameComponent> = {
  pontaria: Pontaria,
  meu_jogo: MeuJogo,   // ← novo
};
```

3. **Atividade:** a fonoaudióloga já consegue selecionar "meu_jogo" no painel, sem novo deploy.

Cada jogo usa o mesmo `GameCtx` (`registerAttempt`, `end`, `observation`), garantindo
registro de tentativas e encerramento de sessão automaticamente.

---

## 5. Privacidade, LGPD e segurança

- **Perfis separados:** `fono` (dona dos pacientes) e `responsavel` (vinculado por
  `patient_guardians`). Toda consulta de paciente passa por `assertPatientAccess`.
- **Sem vazamento entre contas:** cada fonoaudióloga só enxerga os pacientes que cadastrou;
  atividades clonadas não carregam dados pessoais.
- **Nenhum diagnóstico automático:** o relatório exibe *frequência de uso*, *registros marcados
  pelo responsável* e *evolução clínica* (lançada só pela profissional), em seções separadas.
- **Sem classificação automática de pronúncia:** tentativas são gravadas como `nao_avaliado`
  até que a profissional/responsável as marque.
- **Materiais protegidos:** a importação exige declaração de direitos
  (`proprio` / `licenciado` / `autorizado`) e nota de origem. Nada é liberado à criança sem
  aprovação da fonoaudióloga.
- **Voz:** o consentimento do responsável e a autorização específica para gravações ficam
  registrados no paciente (`consent_at`, `voice_consent_at`). A versão atual **não grava a voz** —
  o campo existe para a próxima etapa.
- **Exclusão (LGPD):** `DELETE /api/patients/:id` oculta os dados; a exclusão definitiva
  depende de solicitação formal, respeitando obrigações legais de guarda.
- **Senhas:** bcrypt. **Tokens:** JWT. Em produção, defina um `JWT_SECRET` longo e aleatório.

Antes de usar com crianças reais, recomenda-se Adequação/avaliação de impacto e revisão do
encarregado (titular dos direitos).

---

## 6. Acessibilidade e experiência infantil

- Botões grandes, cores suaves, mascote original (**Fubá**), layout responsivo
  (celular, tablet, computador).
- Narração por voz (Web Speech API, funciona offline), opção de desligar e ajustar velocidade.
- Ajuste de **animações** (respeita `prefers-reduced-motion` do sistema).
- **Recompensas simbólicas** sem punição: a criança pode pausar ou interromper a qualquer
  momento; a tela mostra "Pode parar quando quiser — não há errado e não perde nada."
- Poucas atividades por sessão (visão "missões", não lista infinita).

---

## 7. Publicar na Hostinger

A Hostinger oferece **hospedagem com Node.js** e **MySQL**.

1. **Banco:** no hPanel, abra o gerenciador MySQL, crie um banco e um usuário (anote host,
   usuário, senha e porta). Rode `db/schema.sql` e `db/seed.sql` pelo phpMyAdmin/importação,
   ou pelo terminal com `npm run db:seed`.
2. **Aplicação:** em "Sites/Node.js", crie a aplicação apontando para a raiz do projeto.
   Configure:
   - `NODE_VERSION` = 20 ou superior
   - start script: `node dist/index.js` (após `npm run build`)
   - variáveis de ambiente: `DB_*`, `JWT_SECRET`, `CORS_ORIGIN`, `UPLOAD_DIR`
3. **Build:** `npm install && cd web && npm install && npm run build && cd .. && npm run build`
   — a API já serve `web/dist` na mesma porta, então um único app basta.
4. Permita escrita em `storage/` (uploads).

> Se sua Hostinger for apenas **hospedagem estática**, use apenas a pasta `web/dist` no
> `public_html` e aponte a API para um serviço Node — nesse caso, ajuste o proxy `/api`.

---

## 8. Material de referência e direitos autorais

As figuras de referência usadas para estruturar os jogos são de autoria da fonoaudióloga
**Cibile Cecconi Capovilla** (CRFa. 6-10489-2) e são **protegidas por direitos autorais**.
Este projeto **não reproduz** essas figuras. Foram utilizadas apenas a **tipologia** dos
exercícios (hierarquia, pontaria, memória, identificação de figuras, instalação de fonemas),
com **conteúdo, ilustrações e mascote originais**.

Para usar materiais de terceiros, cadastre-os em **Biblioteca e importação** com a declaração de
direitos correta, ou solicite autorização à autora.

---

## 9. Próximos passos sugeridos

- Gravação de voz da criança com autorização registrada, para revisão da fonoaudióloga.
- Galeria de imagens próprias com upload e substituição dos emojis provisórios.
- Reconhecimento de voz **apenas como auxiliar** e sempre com validação profissional.
- Notificações de rotina e impressão de fichas para papel.
- Testes automatizados e auditoria de segurança independente.