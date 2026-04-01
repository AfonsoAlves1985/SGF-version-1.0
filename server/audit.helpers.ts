import * as db from './db';

export interface AuditLogEntry {
  userId: number;
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout';
  module: string;
  recordId?: number;
  recordName?: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failed';
  errorMessage?: string;
}

/**
 * Registrar ação no log de auditoria
 */
export async function logAuditAction(entry: AuditLogEntry): Promise<void> {
  try {
    await db.createAuditLog({
      userId: entry.userId,
      action: entry.action,
      module: entry.module,
      recordId: entry.recordId,
      recordName: entry.recordName,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      status: entry.status || 'success',
      errorMessage: entry.errorMessage,
    });
  } catch (error) {
    console.error('[AuditLog] Erro ao registrar ação:', error);
    // Não lançar erro para não quebrar a operação principal
  }
}

/**
 * Registrar login bem-sucedido
 */
export async function logLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditAction({
    userId,
    action: 'login',
    module: 'auth',
    status: 'success',
    ipAddress,
    userAgent,
  });
}

/**
 * Registrar tentativa de login falhada
 */
export async function logFailedLogin(email: string, ipAddress?: string, userAgent?: string, reason?: string): Promise<void> {
  await logAuditAction({
    userId: 0, // Usuário desconhecido
    action: 'login',
    module: 'auth',
    recordName: email,
    status: 'failed',
    errorMessage: reason || 'Credenciais inválidas',
    ipAddress,
    userAgent,
  });
}

/**
 * Registrar logout
 */
export async function logLogout(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
  await logAuditAction({
    userId,
    action: 'logout',
    module: 'auth',
    ipAddress,
    userAgent,
  });
}

/**
 * Registrar criação de registro
 */
export async function logCreate(
  userId: number,
  module: string,
  recordId: number,
  recordName: string,
  data?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    userId,
    action: 'create',
    module,
    recordId,
    recordName,
    changes: data,
    ipAddress,
    userAgent,
  });
}

/**
 * Registrar atualização de registro
 */
export async function logUpdate(
  userId: number,
  module: string,
  recordId: number,
  recordName: string,
  before: Record<string, any>,
  after: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const changes = {
    before,
    after,
  };

  await logAuditAction({
    userId,
    action: 'update',
    module,
    recordId,
    recordName,
    changes,
    ipAddress,
    userAgent,
  });
}

/**
 * Registrar deleção de registro
 */
export async function logDelete(
  userId: number,
  module: string,
  recordId: number,
  recordName: string,
  data?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await logAuditAction({
    userId,
    action: 'delete',
    module,
    recordId,
    recordName,
    changes: data,
    ipAddress,
    userAgent,
  });
}

/**
 * Extrair IP do request
 */
export function getClientIp(req: any): string | undefined {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    undefined
  );
}

/**
 * Extrair User-Agent do request
 */
export function getUserAgent(req: any): string | undefined {
  return req.headers['user-agent'];
}
