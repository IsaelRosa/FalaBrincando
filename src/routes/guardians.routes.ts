import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { q, one, run } from '../db.js';
import { requireAuth, requireRole, assertPatientAccess, type AuthUser } from '../auth.js';

export const guardianRouter = Router();
guardianRouter.use(requireAuth);

/** Senha sugerida, fácil de ler ao telefone e difícil de adivinhar. */
function sugerirSenha(nome: string) {
  const base = (nome.split(' ')[0] ?? 'Fala').replace(/[^a-zA-Z]/g, '').slice(0, 6) || 'Fala';
  const n = crypto.randomInt(100, 1000);
  const s = crypto.randomInt(10, 100);
  return `${base}${n}@${s}`;
}

/** ---------------------------------------------------------------
 * Lista os responsáveis de um paciente e o status do acesso.
 * --------------------------------------------------------------- */
guardianRouter.get('/:patientId', async (req, res) => {
  const user = req.user as AuthUser;
  if (!(await assertPatientAccess(user, Number(req.params.patientId))))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  const rows = await q(
    `SELECT g.id, g.relation, g.status, g.valido_de, g.valido_ate, g.observacao_acesso,
            u.id AS user_id, u.email, u.display_name, u.phone
     FROM patient_guardians g
     JOIN users u ON u.id = g.guardian_id
     WHERE g.patient_id = ?
     ORDER BY u.display_name`,
    [req.params.patientId]
  );

  const hoje = new Date().toISOString().slice(0, 10);
  res.json(
    rows.map((r: any) => ({
      ...r,
      vencido: !!(r.valido_ate && String(r.valido_ate) < hoje),
      fora_da_validade: !!(r.valido_de && String(r.valido_de) > hoje),
    }))
  );
});

/** ---------------------------------------------------------------
 * Cria (ou reutiliza) a conta do responsável e define o acesso:
 * senha sugerida pela fonoaudióloga e período de validade.
 * --------------------------------------------------------------- */
const criarSchema = z.object({
  email: z.string().email('E-mail inválido'),
  nome: z.string().min(2, 'Informe o nome do responsável').optional(),
  telefone: z.string().optional().nullable(),
  relation: z.string().optional(),
  senha: z.string().min(4, 'A senha precisa ter ao menos 4 caracteres').optional(),
  valido_de: z.string().optional().nullable(),
  valido_ate: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

guardianRouter.post('/:patientId', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  const parsed = criarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;
  const email = d.email.toLowerCase();

  if (d.valido_de && d.valido_ate && d.valido_ate < d.valido_de)
    return res.status(400).json({ error: 'A data final é anterior à inicial.' });

  // Conta existente? reaproveita; senão cria.
  let conta = await one<any>('SELECT id, display_name FROM users WHERE email=?', [email]);
  let senhaCriada: string | null = null;

  if (!conta) {
    const senha = d.senha || sugerirSenha(d.nome ?? d.email);
    const hash = await bcrypt.hash(senha, 10);
    const r = await run(
      'INSERT INTO users (email,password_hash,role,display_name,phone) VALUES (?,?,?,?,?)',
      [email, hash, 'responsavel', d.nome ?? email.split('@')[0], d.telefone ?? null]
    );
    conta = { id: r.insertId, display_name: d.nome };
    senhaCriada = senha;
  }

  // Senha definida pela fonoaudióloga tem prioridade sobre a gerada.
  const senhaFono = d.senha ? await bcrypt.hash(d.senha, 10) : null;

  await run(
    `INSERT INTO patient_guardians
       (patient_id, guardian_id, relation, senha_hash, valido_de, valido_ate, status, criado_por, observacao_acesso)
     VALUES (?,?,?,?,?,?,'ativo',?,?)
     ON DUPLICATE KEY UPDATE
       relation=VALUES(relation),
       senha_hash=COALESCE(VALUES(senha_hash), senha_hash),
       valido_de=VALUES(valido_de),
       valido_ate=VALUES(valido_ate),
       status='ativo',
       criado_por=VALUES(criado_por),
       observacao_acesso=VALUES(observacao_acesso)`,
    [patientId, conta.id, d.relation ?? 'Responsável', senhaFono,
     d.valido_de ?? null, d.valido_ate ?? null, user.id, d.observacao ?? null]
  );

  // Espelha o período no cadastro do paciente.
  if (d.valido_de || d.valido_ate)
    await run(
      'UPDATE patients SET tratamento_inicio=COALESCE(?,tratamento_inicio), tratamento_fim=COALESCE(?,tratamento_fim) WHERE id=?',
      [d.valido_de ?? null, d.valido_ate ?? null, patientId]
    );

  res.status(201).json({
    ok: true,
    email,
    senha_sugerida: senhaCriada ?? (d.senha ? '(definida pela fonoaudióloga)' : '(conta já existia)'),
    msg: conta.id && senhaCriada
      ? 'Conta criada. Passe a senha ao responsável por um canal seguro.'
      : 'Acesso configurado.',
  });
});

/** Suspende, encerra ou estende o acesso. */
const patchSchema = z.object({
  status: z.enum(['ativo', 'suspenso', 'encerrado']).optional(),
  valido_ate: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
  senha: z.string().min(4).optional(),
});

guardianRouter.patch('/:patientId/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const d = parsed.data;

  const senhaHash = d.senha ? await bcrypt.hash(d.senha, 10) : null;

  const r = await run(
    `UPDATE patient_guardians SET
       status=COALESCE(?,status),
       valido_ate=COALESCE(?,valido_ate),
       observacao_acesso=COALESCE(?,observacao_acesso),
       senha_hash=COALESCE(?,senha_hash)
     WHERE id=? AND patient_id=?`,
    [d.status ?? null, d.valido_ate ?? null, d.observacao ?? null, senhaHash,
     req.params.id, patientId]
  );
  if (!r.affectedRows) return res.status(404).json({ error: 'Vínculo não encontrado.' });
  res.json({ ok: true });
});

/** Remove o acesso (não apaga a conta). */
guardianRouter.delete('/:patientId/:id', requireRole('fono'), async (req, res) => {
  const user = req.user as AuthUser;
  const patientId = Number(req.params.patientId);
  if (!(await assertPatientAccess(user, patientId)))
    return res.status(403).json({ error: 'Sem acesso ao paciente.' });
  await run('DELETE FROM patient_guardians WHERE id=? AND patient_id=?', [req.params.id, patientId]);
  res.json({ ok: true });
});