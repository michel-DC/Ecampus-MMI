import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestSetup } from './utils/test-setup';
import request from 'supertest';
import { UserRole } from '@prisma/client';

describe('Module d\'Authentification (e2e)', () => {
  const setup = new TestSetup();
  let app: any;

  beforeAll(async () => {
    app = await setup.init();
  });

  afterAll(async () => {
    await setup.close();
  });

  beforeEach(async () => {
    await setup.cleanup();
  });

  describe('GET /api/auth/me', () => {
    it('devrait retourner 401 si non authentifié', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/me');
      expect(response.status).toBe(401);
    });

    it('devrait retourner les informations de l\'utilisateur si authentifié', async () => {
      const { user, sessionToken } = await setup.createTestUser(UserRole.STUDENT);

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(user.email);
      expect(response.body.data.role).toBe(UserRole.STUDENT);
    });
  });

  describe('POST /api/auth/onboarding', () => {
    it('devrait terminer l\'onboarding pour un étudiant', async () => {
      const { user, sessionToken } = await setup.createTestUser(UserRole.STUDENT);
      
      const prisma = setup.prisma;
      
      const promotion = await prisma.promotion.create({
        data: { label: 'MMI 1', yearLevel: 1, academicYear: 2026 }
      });
      
      const group = await prisma.group.create({
        data: { name: 'GROUPE A1' }
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/onboarding')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          promotionId: promotion.id,
          groupId: group.id,
          imageUrl: 'https://test.com/image.png'
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
      
      const profile = await prisma.studentProfile.findUnique({
        where: { userId: user.id }
      });
      expect(profile).toBeDefined();
      expect(profile?.promotionId).toBe(promotion.id);
    });
  });

  describe('POST /api/auth/sign-up/teacher', () => {
    it('devrait permettre à un administrateur de créer un enseignant', async () => {
      const { sessionToken } = await setup.createTestUser(UserRole.ADMIN);

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up/teacher')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          email: 'nouveau-prof@univ.fr',
          firstname: 'Prof',
          lastname: 'Test'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('nouveau-prof@univ.fr');
    });

    it('devrait interdire à un étudiant de créer un enseignant', async () => {
      const { sessionToken } = await setup.createTestUser(UserRole.STUDENT);

      const response = await request(app.getHttpServer())
        .post('/api/auth/sign-up/teacher')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          email: 'illegal@univ.fr',
          firstname: 'Hacker',
          lastname: 'Student'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/auth/profile-image', () => {
    it('devrait mettre à jour l\'image de profil', async () => {
      const { user, sessionToken } = await setup.createTestUser(UserRole.STUDENT);

      const response = await request(app.getHttpServer())
        .post('/api/auth/profile-image')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          imageUrl: 'https://nouvelle-image.png'
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);

      const updatedUser = await setup.prisma.user.findUnique({
        where: { id: user.id }
      });
      expect(updatedUser?.image).toBe('https://nouvelle-image.png');
    });
  });
});
