import { Router } from 'express';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, assertPatientAccess, type AuthUser } from '../auth.js';

export const libraryRouter = Router();
libraryRouter.use(requireAuth);

/** Habilidades terapêuticas — seção 4 do escopo. */
export const HABILIDADES = [
  { key: 'articulacao', nome: 'Articulação e pronúncia', descricao: 'Produção dos sons da fala conforme avaliação profissional.' },
  { key: 'consciencia_fonologica', nome: 'Consciência fonológica', descricao: 'Rimas, sílabas, sons iniciais e discriminação auditiva.' },
  { key: 'linguagem', nome: 'Desenvolvimento da linguagem', descricao: 'Nomear, categorizar, formar frases e comprehensively.' },
  { key: 'comunicacao_funcional', nome: 'Comunicação funcional', descricao: 'Pedir ajuda, expressar desejos e manter diálogos.' },
  { key: 'fluencia', nome: 'Fluência da fala', descricao: 'Organização de turnos e redução de pressão comunicativa.' },
  { key: 'motricidade_orofacial', nome: 'Motricidade orofacial', descricao: 'Somente com indicação e instruções do fonoaudiólogo.' },
] as const;

const json = (v: any) => (v === undefined || v === null || v === '' ? null : JSON.stringify(v));

function normalize(row: any) {
  const p = (v: any) => {
    if (!v) return null;
    try { return typeof v === 'string' ? JSON.parse(v) : v; } catch { return v; }
  };
  return {
    ...row,
    materiais: p(row.materiais),
    passos: p(row.passos),
    tags: p(row.tags),
    config: p(row.config),
  };
}

/** Calcula a idade a partir da data de nascimento. */
export function idade(birth?: string | null): number | null {
  if (!birth) return null;
  const n = new Date(birth);
  if (isNaN(n.getTime())) return null;
  const hoje = new Date();
  let a = hoje.getFullYear() - n.getFullYear();
  const m = hoje.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) a--;
  return a;
}

libraryRouter.get('/habilidades', (_req, res) => res.json(HABILIDADES));

// ---------- LISTAGEM COM FILTROS ----------
libraryRouter.get('/', async (req, res) => {
  const user = req.user as AuthUser;
  const { habilidade, idade: idadeFiltro, nivel, search } = req.query as any;

  const where: string[] = [];
  const params: any[] = [];

  if (user.role === 'fono') {
    where.push('(fono_id = ? OR fono_id IS NULL)');
    params.push(user.id);
  }
  where.push("status = 'aprovado'");
  if (habilidade) { where.push('habilidade = ?'); params.push(habilidade); }
  if (nivel) { where.push('nivel = ?'); params.push(nivel); }
  if (search) { where.push('(title LIKE ? OR descricao LIKE ? OR objetivo LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  // Filtro por idade: a atividade deve ser compatível com a idade da criança.
  const rows = await q(
    `SELECT * FROM activity_library ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY habilidade, FIELD(nivel,'1','2','3'), idade_min LIMIT 400`,
    params
  );

  let lista = rows.map(normalize);
  if (idadeFiltro) {
    const a = Number(idadeFiltro);
    lista = lista.filter((l: any) => a >= l.idade_min && a <= l.idade_max);
  }
  res.json(lista);
});

const libSchema = z.object({
  game_key: z.string().min(1),
  title: z.string().min(2, 'Informe o título'),
  habilidade: z.enum(['articulacao', 'consciencia_fonologica', 'linguagem', 'comunicacao_funcional', 'fluencia', 'motricidade_orofacial']),
  descricao: z.string().nullable().optional(),
  objetivo: z.string().nullable().optional(),
  materiais: z.any().nullable().optional(),
  passos: z.any().nullable().optional(),
  modelo_fala: z.string().nullable().optional(),
  tempo_min: z.coerce.number().int().min(1).max(30).optional(),
  idade_min: z.coerce.number().int().min(0).max(18).optional(),
  idade_max: z.coerce.number().int().min(0).max(18).optional(),
  nivel: z.string().optional(),
  criterios: z.string().nullable().optional(),
  adaptacoes: z.string().nullable().optional(),
  orientacoes: z.string().nullable().optional(),
  config: z.any().nullable().optional(),
  phoneme_id: z.coerce.number().int().nullable().optional(),
  tags: z.any().nullable().optional(),
});

libraryRouter.post('/', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const p = libSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  const d = p.data as any;

  // Motricidade orofacial exige instrução escrita (indicação profissional).
  if (d.habilidade === 'motricidade_orofacial' && !d.passos && !d.modelo_fala) {
    return res.status(400).json({
      error: 'Atividades de motricidade orofacial exigem passos ou modelo de fala definidos pelo profissional.',
    });
  }

  const r = await run(
    `INSERT INTO activity_library (fono_id,game_key,title,habilidade,descricao,objetivo,materiais,passos,
      modelo_fala,tempo_min,idade_min,idade_max,nivel,criterios,adaptacoes,orientacoes,config,phoneme_id,tags)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [user.id, d.game_key, d.title, d.habilidade, d.descricao ?? null, d.objetivo ?? null,
     json(d.materiais), json(d.passos), d.modelo_fala ?? null, d.tempo_min ?? 10,
     d.idade_min ?? 3, d.idade_max ?? 12, d.nivel ?? '1', d.criterios ?? null,
     d.adaptacoes ?? null, d.orientacoes ?? null, json(d.config),
     d.phoneme_id ?? null, json(d.tags)]
  );
  res.status(201).json({ id: r.insertId });
});

libraryRouter.patch('/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const p = libSchema.partial().safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: p.error.issues[0].message });
  const d = p.data as any;
  const atual = await one<any>('SELECT * FROM activity_library WHERE id=?', [req.params.id]);
  if (!atual) return res.status(404).json({ error: 'Atividade não encontrada' });
  if (atual.fono_id !== null && atual.fono_id !== user.id)
    return res.status(403).json({ error: 'Atividade de outra conta.' });

  await run(
    `UPDATE activity_library SET title=COALESCE(?,title), descricao=?, objetivo=?, materiais=?,
       passos=?, modelo_fala=?, tempo_min=COALESCE(?,tempo_min), idade_min=COALESCE(?,idade_min),
       idade_max=COALESCE(?,idade_max), nivel=COALESCE(?,nivel), criterios=?, adaptacoes=?,
       orientacoes=?, config=?, tags=? WHERE id=?`,
    [d.title ?? null, d.descricao ?? null, d.objetivo ?? null,
     d.materiais === undefined ? atual.materiais : json(d.materiais),
     d.passos === undefined ? atual.passos : json(d.passos),
     d.modelo_fala ?? null, d.tempo_min ?? null, d.idade_min ?? null, d.idade_max ?? null,
     d.nivel ?? null, d.criterios ?? null, d.adaptacoes ?? null, d.orientacoes ?? null,
     d.config === undefined ? atual.config : json(d.config),
     d.tags === undefined ? atual.tags : json(d.tags), req.params.id]
  );
  res.json({ ok: true });
});

libraryRouter.delete('/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const a = await one<any>('SELECT fono_id FROM activity_library WHERE id=?', [req.params.id]);
  if (!a) return res.status(404).json({ error: 'Atividade não encontrada' });
  if (a.fono_id !== null && a.fono_id !== user.id)
    return res.status(403).json({ error: 'Atividade de outra conta.' });
  await run('DELETE FROM activity_library WHERE id=?', [req.params.id]);
  res.json({ ok: true });
});

/**
 * Instancia uma atividade da biblioteca no plano de um paciente,
 * copiando objetivo, materiais, passos, critérios e adaptações.
 * Sem dados pessoais entre contas.
 */
libraryRouter.post('/:id/instanciar', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const { patient_id, frequency, difficulty } = req.body ?? {};
  if (!patient_id) return res.status(400).json({ error: 'Informe o paciente.' });
  if (!(await assertPatientAccess(user, Number(patient_id))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  const lib = await one<any>('SELECT * FROM activity_library WHERE id=?', [req.params.id]);
  if (!lib) return res.status(404).json({ error: 'Atividade não encontrada' });

  const r = await run(
    `INSERT INTO activity_plans (patient_id,phoneme_id,stage_key,game_key,title,config,instructions,
       frequency,duration_min,library_id,objetivo,habilidade,materiais,passos,modelo_fala,nivel,
       criterios,adaptacoes,orientacoes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [patient_id, lib.phoneme_id ?? null, null, lib.game_key, lib.title, lib.config, lib.orientacoes,
     frequency ?? 'Diária', lib.tempo_min, lib.id, lib.objetivo, lib.habilidade, lib.materiais,
     lib.passos, lib.modelo_fala, difficulty ?? lib.nivel, lib.criterios, lib.adaptacoes, lib.orientacoes]
  );
  res.status(201).json({ id: r.insertId });
});