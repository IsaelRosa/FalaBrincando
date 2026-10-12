import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './config.js';
import { one } from './db.js';

export type Role = 'fono' | 'responsavel';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  display_name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signToken(u: AuthUser) {
  return jwt.sign(u, env.jwtSecret, { expiresIn: env.jwtExpires as any });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado' });
  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}

/**
 * Controle de acesso: devolve os IDs de pacientes aos quais o usuário tem acesso.
 * fono        -> pacientes que ela cadastrou (owner_fono_id)
 * responsavel -> pacientes vinculados em patient_guardians
 * Nenhum dado pessoal é compartilhado entre contas.
 */
export async function accessiblePatientIds(user: AuthUser): Promise<number[]> {
  if (user.role === 'fono') {
    const rows = await one<{ ids: string }>(
      `SELECT GROUP_CONCAT(id) AS ids FROM patients
       WHERE owner_fono_id = ? AND deleted_at IS NULL`,
      [user.id]
    );
    return rows?.ids ? rows.ids.split(',').map(Number) : [];
  }
  const rows = await one<{ ids: string }>(
    `SELECT GROUP_CONCAT(patient_id) AS ids FROM patient_guardians WHERE guardian_id = ?`,
    [user.id]
  );
  return rows?.ids ? rows.ids.split(',').map(Number) : [];
}

/** Garante que o usuário pode acessar aquele paciente. */
export async function assertPatientAccess(user: AuthUser, patientId: number): Promise<boolean> {
  const ids = await accessiblePatientIds(user);
  return ids.includes(Number(patientId));
}

export async function ownsPatient(user: AuthUser, patientId: number): Promise<boolean> {
  if (user.role !== 'fono') {
    // Responsável só "dona" dos vínculos ativos que tem com o paciente.
    const row = await one<{ n: number }>(
      `SELECT COUNT(*) AS n FROM patient_guardians
       WHERE patient_id=? AND guardian_id=? AND status='ativo'`,
      [patientId, user.id]
    );
    return (row?.n ?? 0) > 0;
  }
  const row = await one<{ n: number }>(
    'SELECT COUNT(*) AS n FROM patients WHERE id=? AND owner_fono_id=?',
    [patientId, user.id]
  );
  return (row?.n ?? 0) > 0;
}