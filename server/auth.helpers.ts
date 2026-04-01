import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from './_core/env';

/**
 * Hash de senha com bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

/**
 * Comparar senha com hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Gerar JWT token
 */
export function generateToken(userId: number, role: string, expiresIn = '7d'): string {
  return jwt.sign(
    { userId, role },
    ENV.jwtSecret,
    { expiresIn }
  );
}

/**
 * Verificar e decodificar JWT token
 */
export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    const decoded = jwt.verify(token, ENV.jwtSecret) as { userId: number; role: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Extrair token do header Authorization
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

/**
 * Validar força de senha
 */
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Tipos de roles com hierarquia
 */
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  USER: 'user', // Legado
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Hierarquia de roles (maior número = maior privilégio)
 */
const roleHierarchy: Record<Role, number> = {
  superadmin: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
  user: 1, // Legado = viewer
};

/**
 * Verificar se um role tem permissão sobre outro
 */
export function canManageRole(userRole: Role, targetRole: Role): boolean {
  // Superadmin pode gerenciar tudo
  if (userRole === ROLES.SUPERADMIN) return true;

  // Admin pode gerenciar editor e viewer
  if (userRole === ROLES.ADMIN && (targetRole === ROLES.EDITOR || targetRole === ROLES.VIEWER)) {
    return true;
  }

  // Editor e viewer não podem gerenciar ninguém
  return false;
}

/**
 * Verificar se um role tem permissão para uma ação
 */
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Verificar se um role é superadmin
 */
export function isSuperadmin(role: Role): boolean {
  return role === ROLES.SUPERADMIN;
}

/**
 * Verificar se um role é admin ou superior
 */
export function isAdmin(role: Role): boolean {
  return role === ROLES.SUPERADMIN || role === ROLES.ADMIN;
}

/**
 * Verificar se um role pode editar
 */
export function canEdit(role: Role): boolean {
  return role === ROLES.SUPERADMIN || role === ROLES.ADMIN || role === ROLES.EDITOR;
}
