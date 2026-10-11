import { Router } from 'express';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, accessiblePatientIds, assertPatientAccess, type AuthUser } from '../auth.js';

export const sessionRouter = Router();
sessionRouter.use(requireAuth);

/** "Minha missão de hoje": atividades do dia, sem penalidade se interromper. */
sessionRouter.get('/today/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });

  const activities = await q(
    `SELECT a.id,a.title,a.game_key,a.config,a.instructions,a.frequency,a.duration_min,a.sessions_per_day,
            ph.symbol, ph.name AS phoneme_name, ph.words, ph.syllables, ph.sentences, ph.sound_model,
            hs.nome AS stage_nome
     FROM activity_plans a
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     LEFT JOIN hierarchy_stages hs ON hs.slug=a.stage_key
     WHERE a.patient_id=? AND a.active=1
     ORDER BY COALESCE(hs.ordem,99), a.id`,
    [patientId]
  );

  const today = new Date().toISOString().slice(0, 10);
  const done = await q(
    `SELECT activity_plan_id, COUNT(*) AS sessoes, SUM(attempts) AS tentativas,
            SUM(duration_sec) AS segundos, SUM(stars) AS estrelas
     FROM activity_sessions WHERE patient_id=? AND DATE(started_at)=? AND end_reason='concluida'
     GROUP BY activity_plan_id`,
    [patientId, today]
  );

  res.json({
    patient_id: patientId,
    today,
    activities: activities.map((a: any) => ({
      ...a,
      patient_id: patientId,
      config: safeJson(a.config),
      done: done.find((d: any) => d.activity_plan_id === a.id) ?? null,
    })),
  });
});

/** Inicia uma sessão de atividade. */
sessionRouter.post('/start', async (req, res) => {
  const user = req.user as AuthUser;
  const parsed = z
    .object({ activity_plan_id: z.coerce.number().int(), patient_id: z.coerce.number().int() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });
  const { activity_plan_id, patient_id } = parsed.data;
  if (!(await assertPatientAccess(user, patient_id)))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });

  const act = await one(
    'SELECT id FROM activity_plans WHERE id=? AND patient_id=? AND active=1',
    [activity_plan_id, patient_id]
  );
  if (!act) return res.status(404).json({ error: 'Atividade não encontrada ou inativa.' });

  const r = await run('INSERT INTO activity_sessions (activity_plan_id,patient_id) VALUES (?,?)', [
    activity_plan_id, patient_id,
  ]);
  res.status(201).json({ id: r.insertId });
});

/** Encerra: concluída | pausada | interrompida | abandonada. */
sessionRouter.post('/:id/end', async (req, res) => {
  const user = req.user as AuthUser;
  const parsed = z
    .object({
      end_reason: z.enum(['concluida', 'pausada', 'interrompida', 'abandonada']),
      attempts: z.coerce.number().int().optional(),
      duration_sec: z.coerce.number().int().optional(),
      observations: z.string().nullable().optional(),
      child_feedback: z.string().nullable().optional(),
      stars: z.coerce.number().int().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const ses = await one<any>('SELECT * FROM activity_sessions WHERE id=?', [req.params.id]);
  if (!ses) return res.status(404).json({ error: 'Sessão não encontrada' });
  if (!(await assertPatientAccess(user, ses.patient_id)))
    return res.status(403).json({ error: 'Sem acesso.' });

  const d = parsed.data;
  await run(
    `UPDATE activity_sessions SET ended_at=NOW(), end_reason=?, attempts=COALESCE(?,attempts),
       duration_sec=COALESCE(?,duration_sec), observations=?, child_feedback=?,
       stars=COALESCE(?,stars) WHERE id=?`,
    [d.end_reason, d.attempts ?? null, d.duration_sec ?? null,
     d.observations ?? null, d.child_feedback ?? null, d.stars ?? null, req.params.id]
  );

  // Recompensa simbólica ao concluir (não é pontuação clínica)
  if (d.end_reason === 'concluida' && (d.stars ?? 0) > 0) {
    const patient_id = ses.patient_id;
    const count = await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM activity_sessions WHERE patient_id=? AND end_reason='concluida'`,
      [patient_id]
    );
    if ((count?.n ?? 0) % 5 === 0) {
      await run('INSERT INTO rewards (patient_id,label,emoji) VALUES (?,?,?)', [
        patient_id, `${count!.n} missões completas`, '⭐',
      ]);
    }
  }
  res.json({ ok: true });
});

/** Registra tentativa (círculo da pontaria, carta da memória, etc.). */
sessionRouter.post('/:id/attempts', async (req, res) => {
  const user = req.user as AuthUser;
  const parsed = z
    .object({
      item_ref: z.string().nullable().optional(),
      // NUNCA classificamos automaticamente. O responsável confirma.
      result: z.enum(['acerto', 'erro', 'nao_avaliado']).default('nao_avaliado'),
      position: z.coerce.number().int().nullable().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos' });

  const ses = await one<any>('SELECT * FROM activity_sessions WHERE id=?', [req.params.id]);
  if (!ses) return res.status(404).json({ error: 'Sessão não encontrada' });
  if (!(await assertPatientAccess(user, ses.patient_id)))
    return res.status(403).json({ error: 'Sem acesso.' });

  const d = parsed.data;
  await run('INSERT INTO attempts (session_id,item_ref,result,position) VALUES (?,?,?,?)', [
    req.params.id, d.item_ref ?? null, d.result, d.position ?? null,
  ]);
  await run('UPDATE activity_sessions SET attempts=attempts+1 WHERE id=?', [req.params.id]);
  res.status(201).json({ ok: true });
});

/** Histórico e relatórios de participação. */
sessionRouter.get('/history/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso.' });
  const rows = await q(
    `SELECT s.id, s.activity_plan_id, a.title, a.game_key, ph.symbol,
            s.started_at, s.ended_at, s.end_reason, s.attempts, s.duration_sec,
            s.observations, s.child_feedback, s.stars
     FROM activity_sessions s
     JOIN activity_plans a ON a.id=s.activity_plan_id
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     WHERE s.patient_id=?
     ORDER BY s.started_at DESC LIMIT 200`,
    [patientId]
  );
  res.json(rows);
});

/** Relatório agregado — SEPARA frequência, desempenho e evolução. */
/**
 * Calendário de exercícios (item 8 — painel dos responsáveis).
 * Marca apenas o que foi realmente concluído; nada de cobrança.
 */
sessionRouter.get('/calendario/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso.' });

  const { mes } = req.query as any; // "YYYY-MM"
  const [ano, m] = String(mes ?? new Date().toISOString().slice(0, 7)).split('-').map(Number);
  const ini = `${ano}-${String(m).padStart(2, '0')}-01`;
  const fim = new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);

  const dias = await q(
    `SELECT DATE(started_at) AS dia,
            COUNT(*) AS sessoes,
            SUM(CASE WHEN end_reason='concluida' THEN 1 ELSE 0 END) AS concluidas,
            SUM(duration_sec) AS segundos,
            SUM(stars) AS estrelas
     FROM activity_sessions
     WHERE patient_id=? AND DATE(started_at) BETWEEN ? AND ?
     GROUP BY dia ORDER BY dia`,
    [patientId, ini, fim]
  );

  // Sequência de dias com atividade concluída (incentivo, sem punição).
  const seq = await q(
    `SELECT DISTINCT DATE(started_at) AS dia FROM activity_sessions
     WHERE patient_id=? AND end_reason='concluida'
     ORDER BY dia DESC LIMIT 400`,
    [patientId]
  );
  const datas = new Set(seq.map((s: any) => String(s.dia)));
  let streak = 0;
  const hoje = new Date();
  for (let i = 0; i < 400; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    if (datas.has(iso)) streak++;
    else if (i > 0) break;
  }

  res.json({ mes: `${ano}-${String(m).padStart(2, '0')}`, dias, streak });
});

/**
 * Indicadores por habilidade (item 10).
 * Compara a criança APENAS com o próprio histórico.
 */
sessionRouter.get('/indicadores/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso.' });

  const porHabilidade = await q(
    `SELECT COALESCE(a.habilidade,'sem_classificar') AS habilidade,
            COALESCE(ph.symbol,'—') AS fonema,
            COUNT(*) AS sessoes,
            SUM(CASE WHEN s.end_reason='concluida' THEN 1 ELSE 0 END) AS concluidas,
            SUM(s.duration_sec) AS segundos,
            ROUND(AVG(s.attempts),1) AS media_tentativas
     FROM activity_sessions s
     JOIN activity_plans a ON a.id=s.activity_plan_id
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     WHERE s.patient_id=?
     GROUP BY habilidade, ph.symbol ORDER BY sessoes DESC`,
    [patientId]
  );

  const porAjuda = await q(
    `SELECT COALESCE(child_feedback,'não registrado') AS nivel, COUNT(*) AS n
     FROM activity_sessions WHERE patient_id=? GROUP BY nivel ORDER BY n DESC`,
    [patientId]
  );

  const Ultimas = await q(
    `SELECT DATE(s.started_at) AS dia, COALESCE(a.habilidade,'—') AS habilidade, COUNT(*) AS sessoes
     FROM activity_sessions s JOIN activity_plans a ON a.id=s.activity_plan_id
     WHERE s.patient_id=? GROUP BY dia, habilidade ORDER BY dia DESC LIMIT 30`,
    [patientId]
  );

  const palavras = await q(
    `SELECT at.item_ref AS palavra, COUNT(*) AS tentativas
     FROM attempts at JOIN activity_sessions s ON s.id=at.session_id
     WHERE s.patient_id=? AND at.item_ref IS NOT NULL
     GROUP BY at.item_ref ORDER BY tentativas DESC LIMIT 25`,
    [patientId]
  );

  res.json({
    porHabilidade, porAjuda, ultimas: Ultimas, palavras,
    aviso:
      'Indicadores de acompanhamento de participação e nível de ajuda. ' +
      'A comparação é feita apenas com o histórico da própria criança. ' +
      'Estes dados não são avaliação clínica nem diagnóstico.',
  });
});

sessionRouter.get('/report/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso.' });

  const patient = await one('SELECT nome, apelido FROM patients WHERE id=?', [patientId]);
  const resumo = await q(
    `SELECT DATE(s.started_at) AS dia, a.game_key, ph.symbol,
            COUNT(*) AS sessoes,
            SUM(CASE WHEN s.end_reason='concluida' THEN 1 ELSE 0 END) AS concluidas,
            SUM(s.attempts) AS tentativas,
            SUM(s.duration_sec) AS segundos,
            SUM(s.stars) AS estrelas
     FROM activity_sessions s
     JOIN activity_plans a ON a.id=s.activity_plan_id
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     WHERE s.patient_id=?
     GROUP BY dia, a.game_key, ph.symbol ORDER BY dia DESC`,
    [patientId]
  );

  // Desempenho depende de marcação do responsável: nunca é inferido.
  const desempenho = await q(
    `SELECT ph.symbol, at.result, COUNT(*) AS n
     FROM attempts at
     JOIN activity_sessions s ON s.id=at.session_id
     JOIN activity_plans a ON a.id=s.activity_plan_id
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     WHERE s.patient_id=?
     GROUP BY ph.symbol, at.result`,
    [patientId]
  );

  const etapas = await q(
    `SELECT sp.stage_key, hs.nome, sp.status, sp.ordem_custom, ph.symbol, sp.fono_decision
     FROM stage_plans sp LEFT JOIN hierarchy_stages hs ON hs.slug=sp.stage_key
     LEFT JOIN phonemes ph ON ph.id=sp.phoneme_id
     WHERE sp.patient_id=? ORDER BY ph.symbol, COALESCE(sp.ordem_custom,hs.ordem,99)`,
    [patientId]
  );

  const observacoes = await q(
    `SELECT o.observations, o.child_feedback, o.started_at FROM activity_sessions o
     WHERE o.patient_id=? AND o.observations IS NOT NULL AND o.observations<>'' ORDER BY o.started_at DESC LIMIT 20`,
    [patientId]
  );

  const recompensas = await q('SELECT * FROM rewards WHERE patient_id=? ORDER BY earned_at DESC', [patientId]);

  res.json({
    patient,
    periodo: { inicio: resumo[0]?.dia ?? null, fim: resumo[resumo.length - 1]?.dia ?? null },
    frequencia: resumo,
    desempenho,
    etapas,
    observacoes,
    recompensas,
    aviso:
      'Este relatório apresenta frequência de uso e registros lançados pelo responsável. ' +
      'Não é avaliação clínica e não substitui o acompanhamento da fonoaudióloga.',
  });
});

function safeJson(v: any) {
  if (!v) return {};
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return {}; }
}