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
  if (!user) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    role: user.role,
    display_name: user.display_name,
  };
  res.json({ token: signToken(authUser), user: authUser });
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  display_name: z.string().min(2, 'Informe seu nome'),
  role: z.enum(['fono', 'responsavel']),
  patient_id: z.coerce.number().int().optional(),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const data = parsed.data;

  const exists = await one('SELECT id FROM users WHERE email = ?', [data.email.toLowerCase()]);
  if (exists) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

  const hash = await bcrypt.hash(data.password, 10);
  const r = await run(
    'INSERT INTO users (email,password_hash,role,display_name) VALUES (?,?,?,?)',
    [data.email.toLowerCase(), hash, data.role, data.display_name]
  );

  if (data.role === 'responsavel' && data.patient_id) {
    // Vincula somente se o paciente já existir (convite da fono)
    const pat = await one('SELECT id FROM patients WHERE id = ?', [data.patient_id]);
    if (pat) {
      await run('INSERT IGNORE INTO patient_guardians (patient_id,guardian_id,relation) VALUES (?,?,?)', [
        data.patient_id,
        r.insertId,
        'Responsável',
      ]);
    }
  }

  res.status(201).json({ ok: true, id: r.insertId });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});