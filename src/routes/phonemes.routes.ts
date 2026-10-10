import { Router } from 'express';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, type AuthUser } from '../auth.js';

export const phonemeRouter = Router();
phonemeRouter.use(requireAuth);

const jsonOrNull = (v: any) => (v === undefined || v === null || v === '' ? null : JSON.stringify(v));

const phonemeSchema = z.object({
  symbol: z.string().min(1, 'Informe o símbolo'),
  name: z.string().optional().nullable(),
  kind: z.enum(['consoante', 'grupo_consonantal', 'vogal', 'silaba', 'cluster']).default('consoante'),
  ipa: z.string().nullable().optional(),
  sound_model: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  variation_ptbr: z.string().nullable().optional(),
  target_positions: z.array(z.string()).nullable().optional(),
  syllables: z.any().nullable().optional(),
  combinations: z.any().nullable().optional(),
  words: z.any().nullable().optional(),
  sentences: z.any().nullable().optional(),
  texts: z.string().nullable().optional(),
  audio_refs: z.any().nullable().optional(),
  guardian_instructions: z.string().nullable().optional(),
  objectives: z.string().nullable().optional(),
  followup_criteria: z.string().nullable().optional(),
  clinical_notes: z.string().nullable().optional(),
});

/** Lista: fonemas da profissional + modelos globais. */
phonemeRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  const rows =
    user.role === 'fono'
      ? await q('SELECT * FROM phonemes WHERE fono_id=? OR fono_id IS NULL ORDER BY symbol, id', [user.id])
      : await q('SELECT * FROM phonemes ORDER BY symbol, id');
  res.json(rows.map(normalize));
});

phonemeRouter.get('/:id', async (req, res) => {
  const row = await one<any>('SELECT * FROM phonemes WHERE id=?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Fonema não encontrado' });
  const usage = await q(
    'SELECT patient_id, stage_key, status FROM stage_plans WHERE phoneme_id=?', [row.id]
  );
  res.json({ ...normalize(row), usage });
});

phonemeRouter.post('/', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const parsed = phonemeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data as any;
  const r = await run(
    `INSERT INTO phonemes (fono_id,symbol,name,kind,ipa,sound_model,description,variation_ptbr,
      target_positions,syllables,combinations,words,sentences,texts,audio_refs,
      guardian_instructions,objectives,followup_criteria,clinical_notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [user.id, d.symbol, d.name ?? d.symbol, d.kind, d.ipa ?? null, d.sound_model ?? null,
     d.description ?? null, d.variation_ptbr ?? null,
     d.target_positions ? d.target_positions.join(',') : null,
     jsonOrNull(d.syllables), jsonOrNull(d.combinations), jsonOrNull(d.words),
     jsonOrNull(d.sentences), d.texts ?? null, jsonOrNull(d.audio_refs),
     d.guardian_instructions ?? null, d.objectives ?? null,
     d.followup_criteria ?? null, d.clinical_notes ?? null]
  );
  res.status(201).json({ id: r.insertId });
});

phonemeRouter.patch('/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const existing = await one<any>('SELECT * FROM phonemes WHERE id=?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Fonema não encontrado' });
  // Modelos globais são somente leitura; devem ser clonados pela profissional.
  if (existing.fono_id === null || existing.fono_id !== user.id)
    return res.status(403).json({ error: 'Modelos globais não podem ser editados. Duplique para adaptar.' });

  const parsed = phonemeSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data as any;

  await run(
    `UPDATE phonemes SET symbol=COALESCE(?,symbol), name=COALESCE(?,name), kind=COALESCE(?,kind),
      ipa=?, sound_model=?, description=?, variation_ptbr=?,
      target_positions=COALESCE(?,target_positions), syllables=?, combinations=?, words=?,
      sentences=?, texts=?, audio_refs=?, guardian_instructions=?, objectives=?,
      followup_criteria=?, clinical_notes=?
     WHERE id=? AND fono_id=?`,
    [d.symbol ?? null, d.name ?? null, d.kind ?? null, d.ipa ?? null, d.sound_model ?? null,
     d.description ?? null, d.variation_ptbr ?? null,
     d.target_positions ? d.target_positions.join(',') : null,
     d.syllables === undefined ? existing.syllables : jsonOrNull(d.syllables),
     d.combinations === undefined ? existing.combinations : jsonOrNull(d.combinations),
     d.words === undefined ? existing.words : jsonOrNull(d.words),
     d.sentences === undefined ? existing.sentences : jsonOrNull(d.sentences),
     d.texts ?? null, d.audio_refs === undefined ? existing.audio_refs : jsonOrNull(d.audio_refs),
     d.guardian_instructions ?? null, d.objectives ?? null,
     d.followup_criteria ?? null, d.clinical_notes ?? null,
     req.params.id, user.id]
  );
  res.json({ ok: true });
});

/** Duplica um modelo global (ou outro fonema) para a conta da profissional. */
phonemeRouter.post('/:id/clone', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const src = await one<any>('SELECT * FROM phonemes WHERE id=?', [req.params.id]);
  if (!src) return res.status(404).json({ error: 'Fonema não encontrado' });
  const r = await run(
    `INSERT INTO phonemes (fono_id,symbol,name,kind,ipa,sound_model,description,variation_ptbr,
      target_positions,syllables,combinations,words,sentences,texts,audio_refs,
      guardian_instructions,objectives,followup_criteria,clinical_notes)
     SELECT ?,symbol,name,kind,ipa,sound_model,description,variation_ptbr,target_positions,
      syllables,combinations,words,sentences,texts,audio_refs,guardian_instructions,
      objectives,followup_criteria,clinical_notes FROM phonemes WHERE id=?`,
    [user.id, src.id]
  );
  res.status(201).json({ id: r.insertId });
});

function normalize(row: any) {
  const parse = (v: any) => {
    if (v === null || v === undefined) return null;
    try { return JSON.parse(v); } catch { return v; }
  };
  return {
    ...row,
    target_positions: row.target_positions ? String(row.target_positions).split(',') : [],
    syllables: parse(row.syllables),
    combinations: parse(row.combinations),
    words: parse(row.words),
    sentences: parse(row.sentences),
    audio_refs: parse(row.audio_refs),
    is_global: row.fono_id === null,
  };
}