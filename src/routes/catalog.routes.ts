import { Router } from 'express';
import { q } from '../db.js';
import { requireAuth } from '../auth.js';

export const catalogRouter = Router();
catalogRouter.use(requireAuth);

/** Catálogos: jogos (para extensibilidade), etapas da hierarquia e REPORTs. */
catalogRouter.get('/', async (_req, res) => {
  const [games, stages] = await Promise.all([
    q('SELECT * FROM game_types WHERE ativo=1 ORDER BY sort_order'),
    q('SELECT * FROM hierarchy_stages ORDER BY ordem'),
  ]);
  res.json({ games, stages });
});