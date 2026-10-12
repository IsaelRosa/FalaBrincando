import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { q, one, run } from '../db.js';
import { signToken, requireAuth, type AuthUser } from '../auth.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(4, 'Senha muito curta'),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password } = parsed.data;

  const user = await one<any>(
    'SELECT id,email,password_hash,role,display_name FROM users WHERE email = ? LIMIT 1',
    [email.toLowerCase()]
  );
  if (!user) {
    // Mensagem útil quando o banco está vazio (seed não importado).
    const total = await one<{ n: number }>('SELECT COUNT(*) AS n FROM users');
    if ((total?.n ?? 0) === 0) {
      return res.status(401).json({
        error:
          'Nenhum usuário cadastrado neste banco. No terminal da hospedagem rode: npm run db:users ' +
          '(ou importe db/seed.hostinger.sql pelo phpMyAdmin).',
      });
    }
    return res.status(401).json({
      error: 'Não existe uma conta com este e-mail. Verifique o endereço ou peça um cadastro à fonoaudióloga.',
    });
  }

  /*
   * Controle de acesso do responsável:
   *  - a senha definida pela fonoaudióloga tem prioridade sobre a da conta;
   *  - acesso suspenso, encerrado ou fora da validade impede o login.
   */
  let senhaDaFono = false;
  let temSenhaDaFono = false;
  if (user.role === 'responsavel') {
    const vinculos = await q<any>(
      `SELECT g.status, g.valido_de, g.valido_ate, g.senha_hash, p.nome AS paciente, p.deleted_at
       FROM patient_guardians g JOIN patients p ON p.id = g.patient_id
       WHERE g.guardian_id = ?`,
      [user.id]
    );

    if (!vinculos.length) {
      return res.status(403).json({
        error:
          'Seu acesso ainda não foi liberado pela fonoaudióloga. ' +
          'Peça a ela para vincular este e-mail na aba Responsáveis.',
      });
    }

    const hoje = new Date().toISOString().slice(0, 10);

    /*
     * Regra: o responsável só é barrado se NENHUM dos filhos estiver liberado.
     * Se um deles foi arquivado ou encerrado, os outros continuam funcionando.
     */
    const ativos = vinculos.filter((v) => v.status === 'ativo');
    const expirados =ativos.filter((v) => v.valido_ate && String(v.valido_ate) < hoje);
    const liberados =ativos.filter((v) => !v.valido_ate || String(v.valido_ate) >= hoje);

    if (liberados.length) {
      // Há pelo menos um acesso válido: seguimos.
    } else if (expirados.length) {
      return res.status(403).json({
        error:
          'O período de acompanhamento terminou para todas as crianças vinculadas a este acesso. ' +
          'Fale com a fonoaudióloga.',
      });
    } else if (vinculos.some((v) => v.status === 'suspenso')) {
      return res.status(403).json({
        error: 'Seu acesso está suspenso temporariamente. Fale com a fonoaudióloga.',
      });
    } else {
      return res.status(403).json({
        error: 'Seu acesso foi encerrado. Fale com a fonoaudióloga.',
      });
    }

    // Senha definida pela fonoaudióloga passa a ser a ÚNICA válida.
    const comSenha = vinculos.filter((v) => v.senha_hash);
    if (comSenha.length) {
      const bate = await Promise.all(comSenha.map((v) => bcrypt.compare(password, v.senha_hash)));
      temSenhaDaFono = true;
      senhaDaFono = bate.some(Boolean);
    }
  }

  // Se a fonoaudióloga definiu senha, ela é a ÚNICA aceita.
  const contaOk = temSenhaDaFono
    ? senhaDaFono
    : await bcrypt.compare(password, user.password_hash);
  if (!contaOk)
    return res.status(401).json({
      error: temSenhaDaFono
        ? 'Senha incorreta. A fonoaudióloga definiu uma senha específica para este acesso.'
        : 'E-mail ou senha incorretos.',
    });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    display_name: user.display_name,
  };
  res.json({ token: signToken(authUser), user: authUser });
});

const registerSchema = z.object({
  email: z.string().email('Informe um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  display_name: z.string().min(2, 'Informe seu nome'),
  phone: z.string().optional().nullable(),
  role: z.enum(['fono', 'responsavel']),
});

/**
 * Cadastro público.
 *
 * SEGURANÇA: o responsável cria a conta mas NÃO escolhe a criança.
 * O vínculo é feito só pela fonoaudióloga, na aba Responsáveis.
 * Assim ninguém consegue se attaching a um paciente de outra pessoa.
 */
authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const data = parsed.data;

  const exists = await one('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase()]);
  if (exists)
    return res.status(409).json({
      error:
        'Este e-mail já está cadastrado. Faça login ou peça ajuda à fonoaudióloga.',
    });

  const hash = await bcrypt.hash(data.password, 10);
  const r = await run(
    'INSERT INTO users (email,password_hash,role,display_name,phone) VALUES (?,?,?,?,?)',
    [data.email.toLowerCase(), hash, data.role, data.display_name, data.phone ?? null]
  );

  res.status(201).json({
    ok: true,
    id: r.insertId,
    msg:
      data.role === 'responsavel'
        ? 'Conta criada! Agora aguarde a fonoaudióloga vincular o acesso da sua criança.'
        : 'Conta criada! Você já pode cadastrar pacientes e montar planos.',
  });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});