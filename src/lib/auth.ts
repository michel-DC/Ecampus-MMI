import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';
import { admin } from "better-auth/plugins";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [
    admin(),
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
        before: async (user: Record<string, any>) => {
          return {
            data: {
              ...user,
              role: user.role || 'STUDENT',
            },
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
    fields: {
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
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});