import { Router } from 'express';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, assertPatientAccess, type AuthUser } from '../auth.js';

export const profileRouter = Router();
profileRouter.use(requireAuth);

const p = (v: any) => {
  if (v === undefined || v === null || v === '') return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
};

/** Idade calculada automaticamente a partir da data de nascimento. */
function calcIdade(birth?: string | null) {
  if (!birth) return null;
  const n = new Date(birth);
  if (isNaN(n.getTime())) return null;
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) a--;
  return a;
}

function shape(row: any) {
  const j = (v: any) => {
    if (!v) return null;
    try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; }
  };
  return {
    ...row,
    idade: calcIdade(row.birth_date),
    necessidades: j(row.necessidades),
    preferencias: j(row.preferencias),
    acessibilidade: j(row.acessibilidade),
    metas: j(row.metas),
  };
}

const perfilSchema = z.object({
  nome: z.string().min(2).optional(),
  apelido: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  tipo_comunicacao: z.enum(['oral', 'AAC', 'mista']).optional(),
  necessidades: z.any().nullable().optional(),
  preferencias: z.any().nullable().optional(),
  acessibilidade: z.any().nullable().optional(),
  observacoes_resp: z.string().nullable().optional(),
  metas: z.any().nullable().optional(),
  notes_general: z.string().nullable().optional(),
});

profileRouter.get('/:id', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });
  const row = await one('SELECT * FROM patients WHERE id=?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Paciente não encontrado' });
  res.json(shape(row));
});

profileRouter.patch('/:id', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });
  const parsed = perfilSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data as any;

  // Somente a fonoaudióloga altera dados clínicos/terapêuticos.
  const somenteFono = ['necessidades', 'metas', 'tipo_comunicacao'];
  if (user.role !== 'fono' && somenteFono.some((k) => d[k] !== undefined))
    return res.status(403).json({ error: 'Apenas a fonoaudióloga pode alterar dados clínicos.' });

  const atual = await one<any>('SELECT * FROM patients WHERE id=?', [req.params.id]);

  await run(
    `UPDATE patients SET
       nome=COALESCE(?,nome), apelido=?, birth_date=?, avatar=COALESCE(?,avatar), avatar_url=?,
       tipo_comunicacao=COALESCE(?,tipo_comunicacao),
       necessidades=?, preferencias=?, acessibilidade=?, observacoes_resp=?, metas=?,
       notes_general=?
     WHERE id=?`,
    [d.nome ?? null, d.apelido ?? null, d.birth_date ?? null, d.avatar ?? null, d.avatar_url ?? null,
     d.tipo_comunicacao ?? null,
     d.necessidades === undefined ? atual?.necessidades : p(d.necessidades),
     d.preferencias === undefined ? atual?.preferencias : p(d.preferencias),
     d.acessibilidade === undefined ? atual?.acessibilidade : p(d.acessibilidade),
     d.observacoes_resp ?? null,
     d.metas === undefined ? atual?.metas : p(d.metas),
     d.notes_general ?? null, req.params.id]
  );
  res.json({ ok: true });
});

/** Metas terapêuticas (itens individualizáveis). */
profileRouter.post('/:id/metas', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const { texto, prazo } = req.body ?? {};
  if (!texto) return res.status(400).json({ error: 'Informe a meta.' });
  const atual = await one<any>('SELECT metas FROM patients WHERE id=?', [req.params.id]);
  let metas: any[] = [];
  try { metas = atual?.metas ? JSON.parse(atual.metas) : []; } catch { metas = []; }
  metas.push({ id: Date.now(), texto, prazo: prazo ?? null, feito: false, criado_em: new Date().toISOString() });
  await run('UPDATE patients SET metas=? WHERE id=?', [JSON.stringify(metas), req.params.id]);
  res.json({ ok: true, metas });
});

profileRouter.patch('/:id/metas/:metaId', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });
  const atual = await one<any>('SELECT metas FROM patients WHERE id=?', [req.params.id]);
  let metas: any[] = [];
  try { metas = atual?.metas ? JSON.parse(atual.metas) : []; } catch { metas = []; }
  metas = metas.map((m) => (String(m.id) === String(req.params.metaId) ? { ...m, ...req.body } : m));
  await run('UPDATE patients SET metas=? WHERE id=?', [JSON.stringify(metas), req.params.id]);
  res.json({ ok: true, metas });
});

profileRouter.delete('/:id/metas/:metaId', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const atual = await one<any>('SELECT metas FROM patients WHERE id=?', [req.params.id]);
  let metas: any[] = [];
  try { metas = atual?.metas ? JSON.parse(atual.metas) : []; } catch { metas = []; }
  metas = metas.filter((m) => String(m.id) !== String(req.params.metaId));
  await run('UPDATE patients SET metas=? WHERE id=?', [JSON.stringify(metas), req.params.id]);
  res.json({ ok: true, metas });
});

/**
 * Atividades recomendadas para a criança, filtradas por idade e necessidade.
 * Somente atividades prescritas pela fonoaudióloga aparecem.
 */
profileRouter.get('/:id/recomendados', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });

  const pac = await one<any>('SELECT * FROM patients WHERE id=?', [req.params.id]);
  const idade = calcIdade(pac?.birth_date);

  const planos = await q(
    `SELECT a.*, ph.symbol, gs.nome AS game_nome
     FROM activity_plans a
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     LEFT JOIN game_types gs ON gs.slug=a.game_key
     WHERE a.patient_id=? AND a.active=1 ORDER BY FIELD(a.nivel,'1','2','3'), a.id`,
    [req.params.id]
  );
  res.json({ idade, perfil: shape(pac), planos });
});

/** Registro de como a criança fez: sozinha / com pistas / com ajuda (item 10). */
profileRouter.post('/:id/nivel-ajuda', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });
  const { session_id, nivel_ajuda } = req.body ?? {};
  if (!session_id || !['sozinha', 'com_pistas', 'com_ajuda'].includes(nivel_ajuda))
    return res.status(400).json({ error: 'Dados inválidos.' });
  await run('UPDATE activity_sessions SET child_feedback=? WHERE id=? AND patient_id=?', [
    nivel_ajuda, session_id, req.params.id,
  ]);
  res.json({ ok: true });
});

/** Histórico de habilidades praticadas (para o item 10 do escopo). */
profileRouter.get('/:id/evolucao', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });

  const porHabilidade = await q(
    `SELECT COALESCE(a.habilidade,'sem_classificar') AS habilidade, COUNT(*) AS sessoes,
            SUM(CASE WHEN s.end_reason='concluida' THEN 1 ELSE 0 END) AS concluidas,
            SUM(s.duration_sec) AS segundos
     FROM activity_sessions s JOIN activity_plans a ON a.id=s.activity_plan_id
     WHERE s.patient_id=? GROUP BY habilidade ORDER BY sessoes DESC`,
    [req.params.id]
  );

  // Comparação APENAS com a própria criança ao longo do tempo.
  const porMes = await q(
    `SELECT DATE_FORMAT(started_at,'%Y-%m') AS mes, COUNT(*) AS sessoes, SUM(stars) AS estrelas
     FROM activity_sessions WHERE patient_id=? AND end_reason='concluida'
     GROUP BY mes ORDER BY mes`,
    [req.params.id]
  );

  const nivelAjuda = await q(
    `SELECT COALESCE(s.child_feedback,'não registrado') AS nivel, COUNT(*) AS n
     FROM activity_sessions s WHERE s.patient_id=? GROUP BY nivel`,
    [req.params.id]
  );

  res.json({
    porHabilidade, porMes, nivelAjuda,
    aviso:
      'Indicadores de acompanhamento uso. Comparações são feitas apenas com o histórico da própria criança. ' +
      'Não são avaliação clínica e não substituem o acompanhamento profissional.',
  });
});