import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, type AuthUser } from '../auth.js';
import { env } from '../config.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

// Cada conta grava em sua própria pasta — evita vazamento entre usuários.
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const uid = (req.user as AuthUser | undefined)?.id ?? 0;
    const dir = path.join(env.uploadDir, String(uid));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${randomUUID()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: env.uploadMaxMb * 1024 * 1024 } });

export const materialRouter = Router();
materialRouter.use(requireAuth);

const FIELDS = `id,fono_id,kind,title,description,file_path,mime_type,category,phoneme_id,
  word_position,exercise_type,rights,rights_note,source_ref,status,created_at`;

/** Lista com filtros: categoria, fonema, posição, tipo de exercício. */
materialRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  const { category, phoneme_id, word_position, exercise_type, status, kind } = req.query as any;
  const where: string[] = [];
  const params: any[] = [];

  if (user.role === 'fono') {
    where.push('(fono_id = ? OR fono_id IS NULL)');
    params.push(user.id);
  }
  if (category) { where.push('category = ?'); params.push(category); }
  if (phoneme_id) { where.push('phoneme_id = ?'); params.push(phoneme_id); }
  if (word_position) { where.push('word_position = ?'); params.push(word_position); }
  if (exercise_type) { where.push('exercise_type = ?'); params.push(exercise_type); }
  if (status) { where.push('status = ?'); params.push(status); }
  if (kind) { where.push('kind = ?'); params.push(kind); }

  const sql = `SELECT ${FIELDS} FROM materials
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 500`;
  const rows = await q(sql, params);
  // Materiais globais (fono_id NULL) só aparecem para a fono; filtrar para o responsável:
  const visible =
    user.role === 'fono'
      ? rows
      : rows.filter((r: any) => r.status === 'aprovado');
  res.json(visible);
});

materialRouter.get('/filters', async (_req, res) => {
  const [categories, positions, exercises, games] = await Promise.all([
    q('SELECT DISTINCT category FROM materials WHERE category IS NOT NULL ORDER BY category'),
    q('SELECT DISTINCT word_position FROM materials WHERE word_position IS NOT NULL'),
    q('SELECT DISTINCT exercise_type FROM materials WHERE exercise_type IS NOT NULL'),
    q('SELECT * FROM game_types WHERE ativo=1 ORDER BY sort_order'),
  ]);
  const stages = await q('SELECT * FROM hierarchy_stages ORDER BY ordem');
  res.json({
    categories: categories.map((c: any) => c.category),
    positions: positions.map((p: any) => p.word_position),
    exercises: exercises.map((e: any) => e.exercise_type),
    games: games,
    stages,
  });
});

const materialSchema = z.object({
  kind: z.enum(['imagem', 'audio', 'video', 'pdf', 'ficha']),
  title: z.string().min(1, 'Informe o título'),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  phoneme_id: z.coerce.number().int().nullable().optional(),
  word_position: z.string().nullable().optional(),
  exercise_type: z.string().nullable().optional(),
  rights: z.enum(['proprio', 'licenciado', 'autorizado']).default('proprio'),
  rights_note: z.string().nullable().optional(),
  source_ref: z.string().nullable().optional(),
});

/**
 * Importação de material AUTORIZADO.
 * O sistema não reproduz material protegido: exige declaração de direitos.
 */
materialRouter.post('/', requireRole('fono'), upload.single('file'), async (req, res) => {
  const user = req.user as AuthUser;
  const parsed = materialSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.issues[0].message, fields: parsed.error.issues });
  const d = parsed.data as any;

  if (!d.rights_note && d.rights !== 'proprio') {
    return res.status(400).json({
      error: 'Informe a origem/autorização do material (rights_note). Não importamos material protegido sem autorização.',
    });
  }

  const r = await run(
    `INSERT INTO materials (fono_id,kind,title,description,file_path,mime_type,category,phoneme_id,
       word_position,exercise_type,rights,rights_note,source_ref,status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'revisao')`,
    [user.id, d.kind, d.title, d.description ?? null, req.file?.path ?? null,
     req.file?.mimetype ?? null, d.category ?? null, d.phoneme_id ?? null,
     d.word_position ?? null, d.exercise_type ?? null, d.rights, d.rights_note ?? null,
     d.source_ref ?? null]
  );
  res.status(201).json({ id: r.insertId, msg: 'Importado como "em revisão". Aprove antes de liberar à criança.' });
});

/** Aprova/rejeita — nada vai para a criança sem aprovação da profissional. */
materialRouter.patch('/:id/status', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const parsedStatus = z
    .object({ status: z.enum(['rascunho', 'revisao', 'aprovado', 'rejeitado']) })
    .safeParse(req.body);
  if (!parsedStatus.success) return res.status(400).json({ error: 'Status inválido' });
  const status = parsedStatus.data.status;
  const m = await one<any>('SELECT * FROM materials WHERE id=?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Material não encontrado' });
  if (m.fono_id !== null && m.fono_id !== user.id)
    return res.status(403).json({ error: 'Material de outra conta.' });

  await run(
    'UPDATE materials SET status=?, approved_at=IF(?="aprovado",NOW(),NULL), approved_by=? WHERE id=?',
    [status, status, user.id, req.params.id]
  );
  res.json({ ok: true });
});

/**
 * Lista compacta para o app: somente materiais aprovados.
 * A criança não recebe dados do banco: só título, tipo e arquivo.
 */
materialRouter.get('/catalogo/figuras', requireAuth, async (req, res) => {
  const user = req.user as AuthUser;

  // Fono vê os dela; responsável vê os materiais das fonos ligadas aos seus filhos.
  const linhas = await q<any>(
    `SELECT DISTINCT m.id, m.title, m.kind, m.category, m.phoneme_id, m.file_path, m.mime_type
     FROM materials m
     WHERE m.status='aprovado' AND m.kind IN ('imagem','audio')
       AND (
         m.fono_id IS NULL
         OR m.fono_id = ?
         OR (? = 'responsavel' AND m.fono_id IN (
              SELECT DISTINCT p.owner_fono_id
              FROM patients p
              JOIN patient_guardians g ON g.patient_id = p.id
              WHERE g.guardian_id = ?
         ))
       )`,
    [user.id, user.role, user.id]
  );

  const figs = linhas.map((m: any) => ({
    id: m.id,
    chave: String(m.title ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, ''),
    title: m.title,
    kind: m.kind,
    url: `/api/materials/arquivo/${m.id}`,
  }));

  res.json(figs);
});

/** Serve o arquivo — só para quem tem vínculo com a fono dona do material. */
materialRouter.get('/arquivo/:id', requireAuth, async (req, res) => {
  const user = req.user as AuthUser;
  const m = await one<any>('SELECT * FROM materials WHERE id=?', [req.params.id]);
  if (!m || m.status !== 'aprovado') return res.status(404).end();
  if (!m.file_path || !fs.existsSync(m.file_path)) return res.status(404).end();

  // Material global (sem dono) é liberado; material de fono, só para os vinculados.
  if (m.fono_id && m.fono_id !== user.id) {
    if (user.role !== 'responsavel') return res.status(403).end();
    const vinculo = await one<{ n: number }>(
      `SELECT COUNT(*) n FROM patients p
       JOIN patient_guardians g ON g.patient_id = p.id
       WHERE p.owner_fono_id=? AND g.guardian_id=?`,
      [m.fono_id, user.id]
    );
    if (!vinculo || !vinculo.n) return res.status(403).end();
  }

  // Alguns navegadores não gravam o tipo certo; conferimos pela extensão.
  const MIME: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
    '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf',
  };
  const ext = path.extname(m.file_path).toLowerCase();
  const tipo = (m.mime_type && m.mime_type !== 'application/octet-stream' ? m.mime_type : null)
    ?? MIME[ext]
    ?? 'application/octet-stream';

  res.type(tipo);
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.sendFile(path.resolve(m.file_path));
});

materialRouter.delete('/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const m = await one<any>('SELECT * FROM materials WHERE id=?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Material não encontrado' });
  if (m.fono_id !== null && m.fono_id !== user.id)
    return res.status(403).json({ error: 'Material de outra conta.' });
  if (m.file_path && fs.existsSync(m.file_path)) fs.unlinkSync(m.file_path);
  await run('DELETE FROM materials WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/** Conteúdo extraído de PDF, para a profissional transformar a ficha em atividade digital. */
materialRouter.get('/:id/text', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const m = await one<any>('SELECT * FROM materials WHERE id=?', [req.params.id]);
  if (!m) return res.status(404).json({ error: 'Material não encontrado' });
  if (m.fono_id !== null && m.fono_id !== user.id)
    return res.status(403).json({ error: 'Material de outra conta.' });
  if (m.kind !== 'pdf' || !m.file_path || !fs.existsSync(m.file_path))
    return res.json({ text: null, msg: 'Sem texto extraível.' });
  // unreachable

  const buf = fs.readFileSync(m.file_path);
  try {
    const mod: any = await import('pdf-parse');
    const pdfParse = mod.default ?? mod;
    const data = await pdfParse(buf);
    res.json({ text: data.text?.slice(0, 20000) ?? null });
  } catch (e: any) {
    res.status(500).json({ error: 'Não foi possível ler o PDF: ' + e.message });
  }
});