import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { admin } from 'better-auth/plugins';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [
    admin({
      defaultRole: 'STUDENT',
    }),
  ],
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
      },
      firstname: {
        type: 'string',
        required: true,
      },
      lastname: {
        type: 'string',
        required: true,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (
          user: Record<string, unknown>,
        ): Promise<{ data: Record<string, unknown> }> => {
          return {
            data: {
              ...user,
              role: user.role || 'STUDENT',
            },
          };
        },
        after: async (user: unknown): Promise<void> => {
          if (
            user &&
            typeof user === 'object' &&
            'id' in user &&
            'role' in user
          ) {
            const u = user as { id: string; role: string };
            if (u.role === 'TEACHER') {
              await prisma.teacherProfile.create({
                data: {
                  userId: u.id,
                },
              });
            }
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
