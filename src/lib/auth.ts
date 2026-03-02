import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user.role !== 'STUDENT' && user.role !== 'TEACHER') {
            throw new Error('Le rôle doit être soit STUDENT soit TEACHER');
          }
          return {
            data: user,
          };
        },
        after: async (user) => {
          if (user.role === 'TEACHER') {
            await prisma.teacherProfile.create({
              data: {
                userId: user.id,
              },
            });
          }
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
