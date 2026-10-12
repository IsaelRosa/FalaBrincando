import { Router } from 'express';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, assertPatientAccess, accessiblePatientIds, ownsPatient, type AuthUser } from '../auth.js';

export const patientRouter = Router();
patientRouter.use(requireAuth);

// ---------- LISTAR / CRIAR (fono) ----------
patientRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  if (user.role === 'fono') {
    const rows = await q(
      `SELECT p.*, (SELECT COUNT(*) FROM activity_plans a WHERE a.patient_id=p.id AND a.active=1) AS n_atividades
       FROM patients p WHERE p.owner_fono_id=? AND p.deleted_at IS NULL ORDER BY p.nome`,
      [user.id]
    );
    return res.json(rows);
  }
  const ids = await accessiblePatientIds(user);
  if (!ids.length) return res.json([]);
  const rows = await q(
    `SELECT p.id,p.nome,p.apelido,p.birth_date,p.notes_general,
            (SELECT COUNT(*) FROM activity_plans a WHERE a.patient_id=p.id AND a.active=1) AS n_atividades
     FROM patients p WHERE p.id IN (${ids.map(() => '?').join(',')}) AND p.deleted_at IS NULL`,
    ids
  );
  res.json(rows);
});

const patientSchema = z.object({
  nome: z.string().min(2, 'Informe o nome'),
  apelido: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  notes_general: z.string().optional().nullable(),
  consent_by: z.string().optional().nullable(),
  voice_consent_by: z.string().optional().nullable(),
});

patientRouter.post('/', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const parsed = patientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  const r = await run(
    `INSERT INTO patients (owner_fono_id,nome,apelido,birth_date,notes_general,consent_at,consent_by,voice_consent_at,voice_consent_by)
     VALUES (?,?,?,?,?, IF(? IS NULL, NULL, NOW()), ?, IF(? IS NULL, NULL, NOW()), ?)`,
    [user.id, d.nome, d.apelido ?? null, d.birth_date ?? null, d.notes_general ?? null,
     d.consent_by, d.consent_by, d.voice_consent_by, d.voice_consent_by]
  );
  res.status(201).json({ id: r.insertId });
});

patientRouter.patch('/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Paciente não encontrado ou sem acesso.' });
  const parsed = patientSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  await run(
    `UPDATE patients SET nome=COALESCE(?,nome), apelido=?, birth_date=?, notes_general=COALESCE(?,notes_general)
     WHERE id=? AND owner_fono_id=?`,
    [d.nome ?? null, d.apelido ?? null, d.birth_date ?? null, d.notes_general ?? null,
     req.params.id, user.id]
  );
  res.json({ ok: true });
});

// ---------- VINCULAR RESPONSÁVEL ----------
patientRouter.post('/:id/guardians', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const parsedGuard = z
    .object({ email: z.string().email(), relation: z.string().optional() })
    .safeParse(req.body);
  if (!parsedGuard.success) return res.status(400).json({ error: parsedGuard.error.issues[0].message });
  const email = parsedGuard.data.email;
  const relation = parsedGuard.data.relation;

  const g = await one<{ id: number }>('SELECT id FROM users WHERE email=? AND role="responsavel"', [
    email.toLowerCase(),
  ]);
  if (!g)
    return res.status(404).json({
      error: 'Responsável ainda não possui conta. Peça para ele criar a conta com este e-mail.',
    });
  await run('INSERT IGNORE INTO patient_guardians (patient_id,guardian_id,relation) VALUES (?,?,?)', [
    req.params.id,
    g.id,
    relation ?? 'Responsável',
  ]);
  res.json({ ok: true });
});

// ---------- DETALHE ----------
patientRouter.get('/:id', async (req, res) => {
  const user = req.user as AuthUser;
  const id = Number(req.params.id);
  if (!(await assertPatientAccess(user, id)))
    return res.status(403).json({ error: 'Sem acesso a este paciente.' });

  const patient = await one('SELECT * FROM patients WHERE id=?', [id]);
  if (!patient) return res.status(404).json({ error: 'Paciente não encontrado' });

  const stages = await q(
    `SELECT sp.*, ph.symbol, ph.name, phs.nome AS stage_nome, phs.ordem, phs.cor
     FROM stage_plans sp
     JOIN phonemes ph ON ph.id=sp.phoneme_id
     LEFT JOIN hierarchy_stages phs ON phs.slug=sp.stage_key
     WHERE sp.patient_id=?
     ORDER BY ph.symbol, COALESCE(sp.ordem_custom, phs.ordem, 99)`,
    [id]
  );
  const activities = await q(
    `SELECT a.*, ph.symbol, gs.nome AS game_nome, hs.nome AS stage_nome
     FROM activity_plans a
     LEFT JOIN phonemes ph ON ph.id=a.phoneme_id
     LEFT JOIN game_types gs ON gs.slug=a.game_key
     LEFT JOIN hierarchy_stages hs ON hs.slug=a.stage_key
     WHERE a.patient_id=? AND a.active=1
     ORDER BY a.id`,
    [id]
  );
  const rewards = await q('SELECT * FROM rewards WHERE patient_id=? ORDER BY earned_at DESC', [id]);
  const generalizations = await q(
    'SELECT * FROM generalization_items WHERE patient_id=? ORDER BY id', [id]
  );

  res.json({ patient, stages, activities, rewards, generalizations });
});

// ---------- PLANO DE ETAPAS ----------
const stagePlanSchema = z.object({
  phoneme_id: z.coerce.number().int(),
  stage_key: z.string(),
  status: z.enum(['ativa', 'concluida', 'pausada', 'retomar']).optional(),
  ordem_custom: z.coerce.number().int().nullable().optional(),
  advancement_criteria: z.string().nullable().optional(),
});

patientRouter.post('/:id/stages', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const parsed = stagePlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  await run(
    `INSERT INTO stage_plans (patient_id,phoneme_id,stage_key,status,ordem_custom,advancement_criteria)
     VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE status=VALUES(status), ordem_custom=VALUES(ordem_custom),
       advancement_criteria=VALUES(advancement_criteria)`,
    [req.params.id, d.phoneme_id, d.stage_key, d.status ?? 'pausada',
     d.ordem_custom ?? null, d.advancement_criteria ?? null]
  );
  res.json({ ok: true });
});

patientRouter.patch('/:id/stages/:stageId', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const { status, advancement_criteria, fono_decision, ordem_custom } = req.body ?? {};
  const st = await one<any>('SELECT * FROM stage_plans WHERE id=? AND patient_id=?', [
    req.params.stageId, req.params.id,
  ]);
  if (!st) return res.status(404).json({ error: 'Etapa não encontrada' });
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  await run(
    `UPDATE stage_plans SET status=COALESCE(?,status),
       advancement_criteria=COALESCE(?,advancement_criteria),
       ordem_custom=COALESCE(?,ordem_custom),
       fono_decision=?, decided_at=NOW(), decided_by=? WHERE id=?`,
    [status ?? null, advancement_criteria ?? null, ordem_custom ?? null,
     fono_decision ?? st.fono_decision, user.id, req.params.stageId]
  );
  res.json({ ok: true });
});

// ---------- ATIVIDADES DO PLANO ----------
const activitySchema = z.object({
  phoneme_id: z.coerce.number().int().nullable().optional(),
  stage_key: z.string().nullable().optional(),
  game_key: z.string(),
  title: z.string().min(2, 'Informe um título'),
  config: z.any().optional(),
  instructions: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  duration_min: z.coerce.number().int().nullable().optional(),
  sessions_per_day: z.coerce.number().int().optional(),
});

patientRouter.post('/:id/activities', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  const r = await run(
    `INSERT INTO activity_plans (patient_id,phoneme_id,stage_key,game_key,title,config,instructions,frequency,duration_min,sessions_per_day)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [req.params.id, d.phoneme_id ?? null, d.stage_key ?? null, d.game_key, d.title,
     JSON.stringify(d.config ?? {}), d.instructions ?? null, d.frequency ?? null,
     d.duration_min ?? null, d.sessions_per_day ?? 1]
  );
  res.status(201).json({ id: r.insertId });
});

patientRouter.patch('/:id/activities/:actId', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const parsed = activitySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  await run(
    `UPDATE activity_plans SET title=COALESCE(?,title), config=COALESCE(?,config),
       instructions=COALESCE(?,instructions), frequency=COALESCE(?,frequency),
       duration_min=COALESCE(?,duration_min), sessions_per_day=COALESCE(?,sessions_per_day),
       active=COALESCE(?,active)
     WHERE id=? AND patient_id=?`,
    [d.title ?? null, d.config ? JSON.stringify(d.config) : null, d.instructions ?? null,
     d.frequency ?? null, d.duration_min ?? null, d.sessions_per_day ?? null,
     req.body.active ?? null, req.params.actId, req.params.id]
  );
  res.json({ ok: true });
});

/** Duplica/adaptar uma atividade para outro paciente, sem copiar dados pessoais. */
patientRouter.post('/:id/activities/:actId/clone', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const target = Number(req.params.id);
  if (!(await assertPatientAccess(user, target)))
    return res.status(403).json({ error: 'Sem acesso ao paciente de destino.' });
  const src = await one<any>('SELECT * FROM activity_plans WHERE id=? AND patient_id=?', [
    req.params.actId, target,
  ]);
  if (!src) return res.status(404).json({ error: 'Atividade não encontrada' });
  const r = await run(
    `INSERT INTO activity_plans (patient_id,phoneme_id,stage_key,game_key,title,config,instructions,frequency,duration_min,sessions_per_day,cloned_from)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [target, src.phoneme_id, src.stage_key, src.game_key,
     `${src.title} (cópia)`, src.config, src.instructions, src.frequency,
     src.duration_min, src.sessions_per_day, src.id]
  );
  res.status(201).json({ id: r.insertId });
});

// ---------- OBSERVAÇÕES CLÍNICAS ----------
patientRouter.post('/:id/notes', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const parsedNote = z
    .object({ body: z.string().min(1, 'Escreva a observação'), note_date: z.string().optional() })
    .safeParse(req.body);
  if (!parsedNote.success) return res.status(400).json({ error: parsedNote.error.issues[0].message });
  const r = await run(
    'INSERT INTO clinical_notes (patient_id,fono_id,body,note_date) VALUES (?,?,?,COALESCE(?,CURDATE()))',
    [req.params.id, user.id, parsedNote.data.body, parsedNote.data.note_date ?? null]
  );
  res.status(201).json({ id: r.insertId });
});

patientRouter.get('/:id/notes', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  const rows = await q(
    'SELECT * FROM clinical_notes WHERE patient_id=? ORDER BY note_date DESC, id DESC', [req.params.id]
  );
  res.json(rows);
});

// ---------- Exclusão ----------
/**
 * Mostra o que será removido, para a fonoaudióloga decidir com consciência.
 */
patientRouter.get('/:id/resumo-exclusao', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const id = Number(req.params.id);
  if (!(await ownsPatient(user, id)))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  const [atividades, sessoes, tentativas, notas, gravacoes, vinculos] = await Promise.all([
    one<{ n: number }>('SELECT COUNT(*) n FROM activity_plans WHERE patient_id=?', [id]),
    one<{ n: number }>('SELECT COUNT(*) n FROM activity_sessions WHERE patient_id=?', [id]),
    one<{ n: number }>(
      `SELECT COUNT(*) n FROM attempts a JOIN activity_sessions s ON s.id=a.session_id WHERE s.patient_id=?`,
      [id]
    ),
    one<{ n: number }>('SELECT COUNT(*) n FROM clinical_notes WHERE patient_id=?', [id]),
    one<{ n: number }>('SELECT COUNT(*) n FROM recordings WHERE patient_id=?', [id]),
    one<{ n: number }>('SELECT COUNT(*) n FROM patient_guardians WHERE patient_id=?', [id]),
  ]);

  res.json({
    atividades: atividades?.n ?? 0,
    sessoes: sessoes?.n ?? 0,
    tentativas: tentativas?.n ?? 0,
    notas_clinicas: notas?.n ?? 0,
    gravacoes_de_voz: gravacoes?.n ?? 0,
    responsaveis: vinculos?.n ?? 0,
    ja_arquivado: !!(await one<any>('SELECT deleted_at FROM patients WHERE id=?', [id]))?.deleted_at,
  });
});

/**
 * Remove o paciente do painel.
 *   ?modo=arquivar → some do painel, mantém os dados (recomendado)
 *   ?modo=excluir  → apaga tudo em cascata (definitivo)
 */
patientRouter.delete('/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const id = Number(req.params.id);
  const modo = String(req.query.modo ?? 'arquivar');

  if (!(await ownsPatient(user, id)))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  const alvo = await one<any>('SELECT nome, apelido FROM patients WHERE id=? AND owner_fono_id=?', [
    id, user.id,
  ]);
  if (!alvo) return res.status(404).json({ error: 'Paciente não encontrado.' });

  if (req.body?.confirmar !== alvo.nome && req.body?.nome !== alvo.nome) {
    return res.status(400).json({
      error: 'Digite o nome do paciente exatamente como está para confirmar.',
    });
  }

  if (modo === 'arquivar') {
    await run('UPDATE patients SET deleted_at=NOW() WHERE id=? AND owner_fono_id=?', [id, user.id]);
    // O responsável perde o acesso imediatamente.
    await run('UPDATE patient_guardians SET status=\'encerrado\' WHERE patient_id=?', [id]);
    return res.json({
      ok: true,
      modo: 'arquivar',
      msg: `${alvo.apelido || alvo.nome} foi arquivado e saiu do painel. Os dados continuam guardados.`,
    });
  }

  if (modo === 'excluir') {
    // Arquivos de voz ficam no disco: removemos junto.
    const arquivos = await q<any>('SELECT file_path FROM recordings WHERE patient_id=?', [id]);
    await run('DELETE FROM patients WHERE id=? AND owner_fono_id=?', [id, user.id]);

    // Limpeza de arquivos órfãos (fora da transação).
    const fs = await import('node:fs');
    for (const a of arquivos as any[]) {
      try {
        if (a.file_path && fs.existsSync(a.file_path)) fs.unlinkSync(a.file_path);
      } catch {
        /* arquivo já removido */
      }
    }

    return res.json({
      ok: true,
      modo: 'excluir',
      msg: `${alvo.apelido || alvo.nome} e todos os registros foram excluídos definitivamente.`,
    });
  }

  res.status(400).json({ error: 'Modo inválido. Use "arquivar" ou "excluir".' });
});

/** Traz um paciente arquivado de volta. */
patientRouter.post('/:id/restaurar', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const id = Number(req.params.id);
  if (!(await ownsPatient(user, id)))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  await run('UPDATE patients SET deleted_at=NULL WHERE id=? AND owner_fono_id=?', [id, user.id]);
  await run('UPDATE patient_guardians SET status=\'ativo\' WHERE patient_id=?', [id]);
  res.json({ ok: true, msg: 'Paciente restaurado. Revise o acesso dos responsáveis.' });
});

/** Lista os arquivados, para não sumirem do controle. */
patientRouter.get('/arquivados/lista', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const rows = await q(
    `SELECT id, nome, apelido, deleted_at FROM patients
     WHERE owner_fono_id=? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
    [user.id]
  );
  res.json(rows);
});