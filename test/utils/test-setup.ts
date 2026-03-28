import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export class TestSetup {
  private app: INestApplication;
  public prisma: PrismaService;

  async init() {
    process.env.BETTER_AUTH_URL = 'http://localhost:3000';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = moduleFixture.createNestApplication();
    this.app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    this.prisma = this.app.get<PrismaService>(PrismaService);

    this.app.use(async (req: any, res: any, next: any) => {
      let token = req.headers['x-test-session-token'];
      if (!token && req.headers['authorization']) {
        const authHeader = req.headers['authorization'];
        if (authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }

      if (token) {
        const session = await this.prisma.session.findUnique({
          where: { token },
          include: { user: true }
        });
        if (session) {
          req.user = {
            sub: session.user.id,
            email: session.user.email,
            role: session.user.role,
          };
        }
      }
      next();
    });
    
    await this.app.init();
    return this.app;
  }

  async cleanup() {
    const tablenames = await this.prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    try {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      throw error;
    }
  }

  async close() {
    await this.app.close();
  }

  async createTestUser(role: UserRole = UserRole.STUDENT) {
    const id = uuidv4();
    const email = `test-${id}@example.com`;
    
    const user = await this.prisma.user.create({
      data: {
        id,
        email,
        name: 'Utilisateur Test',
        firstname: 'Prénom',
        lastname: 'Nom',
        role,
        isActive: true,
      },
    });

    const sessionToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        id: uuidv4(),
        userId: user.id,
        token: sessionToken,
        expiresAt,
      },
    });

    const cookie = `better-auth.session_token=${sessionToken}`;

    return { user, sessionToken, cookie };
  }

  getHttpServer() {
    return this.app.getHttpServer();
  }
}
