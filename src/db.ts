import mysql from 'mysql2/promise';
import { env } from './config.js';

/** Remove espaços e caracteres invisíveis colados por engano nas variáveis de ambiente. */
const clean = (v: string | undefined, fallback = '') => (v ?? fallback).trim();

export const pool = mysql.createPool({
  host: clean(env.db.host, 'localhost'),
  port: Number(env.db.port) || 3306,
  user: clean(env.db.user),
  password: env.db.password ?? '',
  database: clean(env.db.database),
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: true,
  namedPlaceholders: true,
});

/** Traduz erros técnicos do MySQL em orientações acionáveis para a profissional. */
export function friendlyDbError(err: any): string {
  const code = err?.code ?? '';
  const host = clean(env.db.host, 'localhost');
  const db = clean(env.db.database);

  const redeErro = ['ECONNREFUSED', 'EINVAL', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'ETIMEDOUT', 'EHOSTUNREACH'];
  if (redeErro.includes(code))
    return `Não foi possível alcançar o MySQL em "${host}:${env.db.port}". Verifique as variáveis DB_HOST e DB_PORT. Na Hostinger use DB_HOST=localhost e DB_PORT=3306, sem espaços nem "http://".`;

  if (code === 'EINVAL' || code === 'ENOTFOUND' || code === 'EAI_AGAIN')
    return `Endereço do MySQL inválido ("${host}"). Não use espaços, protocolo http:// ou caminho. Na Hostinger use apenas "localhost".`;

  if (code === 'ER_ACCESS_DENIED_ERROR')
    return `Usuário ou senha do MySQL incorretos (usuário: "${clean(env.db.user)}"). Confira as credenciais em hPanel › Bancos de Dados MySQL.`;

  if (code === 'ER_BAD_DB_ERROR')
    return `O banco "${db}" não existe. Crie-o no hPanel e importe os arquivos db/schema.hostinger.sql e db/seed.hostinger.sql pelo phpMyAdmin.`;

  if (code === 'ECONNRESET' || code === 'PROTOCOL_CONNECTION_LOST')
    return 'A conexão com o MySQL caiu. Verifique se o banco está ativo no hPanel.';

  if (code?.startsWith?.('ER_NO_SUCH_TABLE'))
    return 'Falta alguma tabela no banco. Importe db/schema.hostinger.sql pelo phpMyAdmin.';

  return err?.message ?? 'Erro desconhecido no banco de dados.';
}

/**
 * O mysql2 launcha erro em parâmetros `undefined` ("Bind parameters must not
 * contain undefined"). Convertemos para `null`, que o SQL trata como NULL.
 */
function normalize(params: any[]): any[] {
  return params.map((p) => (p === undefined ? null : p));
}

export async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.execute(sql, normalize(params));
  return rows as T[];
}

export async function one<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export async function run(sql: string, params: any[] = []) {
  const [res] = await pool.execute(sql, normalize(params));
  return res as mysql.ResultSetHeader;
}