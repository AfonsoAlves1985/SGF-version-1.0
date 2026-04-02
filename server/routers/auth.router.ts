import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { generateToken } from '../auth.helpers';

const DEFAULT_USER = {
  id: 1,
  name: 'Administrador',
  email: 'admin@sistema.com',
  role: 'superadmin',
};

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        email: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.email === 'admin' && input.password === 'admin123') {
        const token = generateToken(DEFAULT_USER.id, DEFAULT_USER.role);
        return {
          success: true,
          token,
          user: DEFAULT_USER,
        };
      }

      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Usuário ou senha incorretos',
      });
    }),

  me: protectedProcedure.query(async () => {
    return {
      ...DEFAULT_USER,
      isActive: true,
    };
  }),

  logout: protectedProcedure.mutation(async () => {
    return { success: true };
  }),

  listUsers: protectedProcedure.query(async () => {
    return [DEFAULT_USER];
  }),
});