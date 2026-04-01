import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import * as auth from '../auth.helpers';
import * as audit from '../audit.helpers';
import { hashPassword, comparePassword, generateToken, validatePasswordStrength, isAdmin, isSuperadmin, canManageRole } from '../auth.helpers';

export const authRouter = router({
  /**
   * Login com email e senha
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email('Email inválido'),
        password: z.string().min(1, 'Senha é obrigatória'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await db.getUserByEmail(input.email);

        if (!user || !user.password) {
          await audit.logFailedLogin(input.email, undefined, undefined, 'Usuário não encontrado ou sem senha');
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Email ou senha incorretos',
          });
        }

        if (!user.isActive) {
          await audit.logFailedLogin(input.email, undefined, undefined, 'Usuário desativado');
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Usuário desativado',
          });
        }

        const passwordMatch = await comparePassword(input.password, user.password);
        if (!passwordMatch) {
          await audit.logFailedLogin(input.email, undefined, undefined, 'Senha incorreta');
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Email ou senha incorretos',
          });
        }

        // Atualizar último login
        await db.updateUserLastLogin(user.id);

        // Gerar token
        const token = generateToken(user.id, user.role);

        // Log de sucesso
        await audit.logLogin(user.id, undefined, undefined);

        return {
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao fazer login',
        });
      }
    }),

  /**
   * Logout
   */
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      await audit.logLogout(ctx.user.id, undefined, undefined);
      return { success: true };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao fazer logout',
      });
    }
  }),

  /**
   * Obter dados do usuário logado
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.getUserById(ctx.user.id);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Usuário não encontrado',
      });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive === 1,
    };
  }),

  /**
   * Listar usuários (apenas admin/superadmin)
   */
  listUsers: protectedProcedure
    .input(
      z.object({
        role: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!isAdmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sem permissão para listar usuários',
        });
      }

      const users = await db.listUsers({
        role: input.role,
        isActive: input.isActive,
      });

      // Filtrar superadmin da lista se não for superadmin
      if (!isSuperadmin(ctx.user.role as any)) {
        return users.filter((u: any) => u.role !== 'superadmin');
      }

      return users;
    }),

  /**
   * Criar novo usuário (apenas admin/superadmin)
   */
  createUser: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        email: z.string().email('Email inválido'),
        password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
        role: z.enum(['superadmin', 'admin', 'editor', 'viewer']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sem permissão para criar usuários',
        });
      }

      // Verificar se pode criar este role
      if (!canManageRole(ctx.user.role as any, input.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Sem permissão para criar usuário com role ${input.role}`,
        });
      }

      // Validar força de senha
      const passwordValidation = validatePasswordStrength(input.password);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Senha fraca: ${passwordValidation.errors.join(', ')}`,
        });
      }

      // Verificar se email já existe
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email já cadastrado',
        });
      }

      const passwordHash = await hashPassword(input.password);

      await db.createUser({
        name: input.name,
        email: input.email,
        password: passwordHash,
        role: input.role as any,
        isActive: 1,
        openId: `local-${Date.now()}`, // ID temporário para usuários locais
        loginMethod: 'local',
      });

      // Buscar usuário criado para obter o ID
      const newUser = await db.getUserByEmail(input.email);
      if (!newUser) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao criar usuário',
        });
      }

      // Log de auditoria
      await audit.logCreate(
        ctx.user.id,
        'users',
        newUser.id,
        input.name,
        { email: input.email, role: input.role }
      );

      return { success: true, userId: newUser.id };
    }),

  /**
   * Atualizar role de usuário (apenas admin/superadmin)
   */
  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(['superadmin', 'admin', 'editor', 'viewer']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sem permissão para atualizar usuários',
        });
      }

      // Não permitir editar superadmin
      if (isSuperadmin(ctx.user.role as any) === false && input.role === 'superadmin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Apenas superadmin pode criar superadmin',
        });
      }

      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      // Não permitir editar superadmin
      if (user.role === 'superadmin' && !isSuperadmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Não pode editar superadmin',
        });
      }

      await db.updateUserRole(input.userId, input.role);

      // Log de auditoria
      await audit.logUpdate(
        ctx.user.id,
        'users',
        input.userId,
        user.name || 'Usuário',
        { role: user.role },
        { role: input.role }
      );

      return { success: true };
    }),

  /**
   * Desativar usuário (apenas admin/superadmin)
   */
  deactivateUser: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sem permissão para desativar usuários',
        });
      }

      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      // Não permitir desativar superadmin
      if (user.role === 'superadmin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Não pode desativar superadmin',
        });
      }

      // Não permitir desativar a si mesmo
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Não pode desativar a si mesmo',
        });
      }

      await db.updateUserActive(input.userId, false);

      // Log de auditoria
      await audit.logUpdate(
        ctx.user.id,
        'users',
        input.userId,
        user.name || 'Usuário',
        { isActive: user.isActive },
        { isActive: 0 }
      );

      return { success: true };
    }),

  /**
   * Resetar senha de usuário (apenas admin/superadmin)
   */
  resetUserPassword: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isAdmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sem permissão para resetar senhas',
        });
      }

      const user = await db.getUserById(input.userId);
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Usuário não encontrado',
        });
      }

      // Apenas superadmin pode resetar senha de admin
      if (user.role === 'admin' && !isSuperadmin(ctx.user.role as any)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sem permissão para resetar senha de admin',
        });
      }

      // Validar força de senha
      const passwordValidation = validatePasswordStrength(input.newPassword);
      if (!passwordValidation.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Senha fraca: ${passwordValidation.errors.join(', ')}`,
        });
      }

      const passwordHash = await hashPassword(input.newPassword);
      await db.updateUserPassword(input.userId, passwordHash);

      // Log de auditoria
      await audit.logUpdate(
        ctx.user.id,
        'users',
        input.userId,
        user.name || 'Usuário',
        { passwordChanged: false },
        { passwordChanged: true }
      );

      return { success: true };
    }),
});
