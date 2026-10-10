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

const app = express();
app.use(cors({ origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',') }));
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', async (_req, res) => {
  const base = { app: 'FalaBrincando', ts: new Date().toISOString() };
  try {
    await q('SELECT 1');
    res.json({ ...base, ok: true, db: 'conectado' });
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