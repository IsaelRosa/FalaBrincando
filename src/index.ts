import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config.js';
import { friendlyDbError, q } from './db.js';
import { authRouter } from './routes/auth.routes.js';
import { patientRouter } from './routes/patients.routes.js';
import { phonemeRouter } from './routes/phonemes.routes.js';
import { sessionRouter } from './routes/sessions.routes.js';
import { materialRouter } from './routes/materials.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { libraryRouter } from './routes/library.routes.js';
import { profileRouter } from './routes/profile.routes.js';
import { recordingRouter } from './routes/recordings.routes.js';
import { guardianRouter } from './routes/guardians.routes.js';

const app = express();
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
app.use(express.json({ limit: '5mb' }));

/**
 * Colunas e tabelas obrigatórias. Se faltar algo, /api/health diz exatamente o quê.
 * Evita descobrir o problema só quando uma tela quebra.
 */
const REQUERIDOS: Record<string, string[]> = {
  patients: ['id','nome','owner_fono_id','avatar','avatar_url','metas','necessidades','preferencias',
             'acessibilidade','observacoes_resp','tipo_comunicacao','lembrete_ativo','lembrete_hora',
             'lembrete_dias','lembrete_texto','tratamento_inicio','deleted_at'],
  activity_plans: ['id','patient_id','game_key','habilidade','objetivo','passos','nivel','library_id'],
  activity_library: ['id','game_key','title','habilidade','idade_min','nivel','status'],
  patient_guardians: ['patient_id','guardian_id','senha_hash','status','valido_ate'],
  recordings: ['id','patient_id','uploaded_by','file_path'],
  phonemes: ['id','symbol','words','syllables','target_positions'],
};

app.get('/api/health', async (_req, res) => {
  const base = { app: 'FalaBrincando', ts: new Date().toISOString() };
  try {
    await q('SELECT 1');

    const faltando: string[] = [];
    for (const [tabela, colunas] of Object.entries(REQUERIDOS)) {
      const linhas = await q<any>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [tabela]
      );
      const existentes = new Set(linhas.map((r) => String(r.COLUMN_NAME ?? r.column_name)));
      if (!existentes.size) {
        faltando.push(`tabela ${tabela}`);
        continue;
      }
      for (const c of colunas) if (!existentes.has(c)) faltando.push(`${tabela}.${c}`);
    }

    if (faltando.length) {
      return res.status(503).json({
        ...base, ok: false, db: 'conectado', schema_incompleto: true,
        faltando,
        aviso:
          'O banco está desatualizado. Importe db/atualizacao.sql e db/acesso.sql pelo phpMyAdmin.',
      });
    }
    res.json({ ...base, ok: true, db: 'conectado', schema: 'completo' });
  } catch (err: any) {
    res.status(503).json({ ...base, ok: false, db: friendlyDbError(err), code: err?.code ?? null });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/patients', patientRouter);
app.use('/api/phonemes', phonemeRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/materials', materialRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/library', libraryRouter);
app.use('/api/profile', profileRouter);
app.use('/api/recordings', recordingRouter);
app.use('/api/guardians', guardianRouter);

// Servir o build do front (SPA) — em produção no mesmo domínio/host
// Build do front fica em web/dist (mesma raiz do projeto)
const webDist = path.resolve(process.cwd(), process.env.WEB_DIST ?? './web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const isDb = err?.code && String(err.code).length >= 5;
  res.status(err.status ?? 500).json({
    error: isDb ? friendlyDbError(err) : err.message ?? 'Erro interno',
  });
});

app.listen(env.port, () => {
  console.log(`FalaBrincando API em http://localhost:${env.port}`);
});