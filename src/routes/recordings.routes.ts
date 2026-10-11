import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, assertPatientAccess, type AuthUser } from '../auth.js';
import { env } from '../config.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

/** Apenas formatos de áudio gerados pelo navegador. */
const storage = multer.diskStorage({
  destination: (req, _f, cb) => {
    const uid = (req.user as AuthUser | undefined)?.id ?? 0;
    const dir = path.join(env.uploadDir, String(uid), 'voz');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_r, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^audio\/(webm|ogg|mpeg|mp4|wav|m4a)$/.test(file.mimetype) ||
               /\.(webm|ogg|mp3|m4a|wav)$/i.test(file.originalname);
    cb(null, ok);
  },
});

export const recordingRouter = Router();
recordingRouter.use(requireAuth);

/**
 * Consentimento para gravações de voz (LGPD / item 12).
 * Sem autorização registrada, a gravação é BLOQUEADA — não há como contornar.
 */
async function temConsentimento(patientId: number): Promise<boolean> {
  const p = await one<any>('SELECT voice_consent_at FROM patients WHERE id=?', [patientId]);
  return !!p?.voice_consent_at;
}

recordingRouter.get('/:patientId/consentimento', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.patientId))))
    return res.status(403).json({ error: 'Sem acesso.' });
  const p = await one<any>(
    'SELECT voice_consent_at, voice_consent_by FROM patients WHERE id=?', [req.params.patientId]
  );
  res.json({
    autorizado: !!p?.voice_consent_at,
    por_quem: p?.voice_consent_by ?? null,
    desde: p?.voice_consent_at ?? null,
  });
});

recordingRouter.post(
  '/:patientId/consentimento',
  requireRole('fono'),
  async (req, res) => {
    const user = req.user as AuthUser;
    if (!(await assertPatientAccess(user, Number(req.params.patientId))))
      return res.status(403).json({ error: 'Sem acesso.' });
    const parsed = z
      .object({ autorizado: z.boolean(), por_quem: z.string().min(2, 'Informe quem autorizou') })
      .safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
    await run(
      'UPDATE patients SET voice_consent_at=IF(? , NOW(), NULL), voice_consent_by=? WHERE id=?',
      [parsed.data.autorizado, parsed.data.por_quem, req.params.patientId]
    );
    res.json({ ok: true });
  }
);

/** Lista gravações do paciente. */
recordingRouter.get('/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.patientId))))
    return res.status(403).json({ error: 'Sem acesso.' });
  const rows = await q(
    `SELECT g.id, g.activity_id, g.mime_type, g.duracao_sec, g.label, g.status,
            g.observacao, g.created_at, g.reviewed_at, a.title AS atividade
     FROM recordings g
     LEFT JOIN activity_plans a ON a.id=g.activity_id
     WHERE g.patient_id=? ORDER BY g.created_at DESC LIMIT 100`,
    [req.params.patientId]
  );
  res.json(rows);
});

/** Envia uma gravação. Exige autorização registrada. */
recordingRouter.post('/:patientId', upload.single('audio'), async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso.' });

  if (!(await temConsentimento(patientId))) {
    if (req.file?.path) fs.unlinkSync(req.file.path);
    return res.status(403).json({
      error:
        'A fonoaudióloga ainda não registrou a autorização para gravações de voz. ' +
        'Peça a ela para registrar antes de gravar.',
    });
  }
  if (!req.file) return res.status(400).json({ error: 'Envie um arquivo de áudio.' });

  const dur = Number(req.body?.duracao_sec ?? 0) || null;
  const label = req.body?.label ?? null;
  const activityId = req.body?.activity_id ? Number(req.body.activity_id) : null;

  const r = await run(
    'INSERT INTO recordings (patient_id,activity_id,uploaded_by,file_path,mime_type,duracao_sec,label) VALUES (?,?,?,?,?,?,?)',
    [patientId, activityId, user.id, req.file.path, req.file.mimetype, dur, label]
  );
  res.status(201).json({ id: r.insertId, aviso: 'Gravação enviada à fonoaudióloga para avaliação.' });
});

/** Reproduz o áudio — somente para quem tem acesso ao paciente. */
recordingRouter.get('/audio/:id', async (req, res) => {
  const user = req.user as AuthUser;
  const g = await one<any>('SELECT * FROM recordings WHERE id=?', [req.params.id]);
  if (!g) return res.status(404).json({ error: 'Gravação não encontrada.' });
  if (!(await assertPatientAccess(user, g.patient_id)))
    return res.status(403).json({ error: 'Sem acesso a esta gravação.' });
  if (!fs.existsSync(g.file_path)) return res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });

  res.type(g.mime_type);
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(path.resolve(g.file_path));
});

/** Revisão clínica da fonoaudióloga. */
recordingRouter.patch('/:id/revisao', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const g = await one<any>('SELECT * FROM recordings WHERE id=?', [req.params.id]);
  if (!g) return res.status(404).json({ error: 'Gravação não encontrada.' });
  if (!(await assertPatientAccess(user, g.patient_id)))
    return res.status(403).json({ error: 'Sem acesso.' });

  const { observacao, status } = req.body ?? {};
  await run(
    `UPDATE recordings SET observacao=?, status=COALESCE(?,status),
       reviewed_at=NOW(), reviewed_by=? WHERE id=?`,
    [observacao ?? g.observacao, status ?? null, user.id, req.params.id]
  );
  res.json({ ok: true });
});

recordingRouter.delete('/:id', async (req, res) => {
  const user = req.user as AuthUser;
  const g = await one<any>('SELECT * FROM recordings WHERE id=?', [req.params.id]);
  if (!g) return res.status(404).json({ error: 'Gravação não encontrada.' });
  if (!(await assertPatientAccess(user, g.patient_id)))
    return res.status(403).json({ error: 'Sem acesso.' });
  if (user.role !== 'fono' && g.uploaded_by !== user.id)
    return res.status(403).json({ error: 'Apenas a fonoaudióloga ou quem enviou pode excluir.' });
  if (g.file_path && fs.existsSync(g.file_path)) fs.unlinkSync(g.file_path);
  await run('DELETE FROM recordings WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});