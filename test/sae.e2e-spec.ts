import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestSetup } from './utils/test-setup';
import request from 'supertest';
import { UserRole } from '@prisma/client';

describe('Module SAE (e2e)', () => {
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

  async function createBasics() {
    const prisma = setup.prisma;
    const promotion = await prisma.promotion.create({
      data: { label: 'MMI 1', yearLevel: 1, academicYear: null }
    });
    const semester = await prisma.semester.create({
      data: { number: 1, promotionId: promotion.id }
    });
    const thematic = await prisma.thematic.create({
      data: { code: 'WEB', label: 'Développement Web' }
    });
    const banner = await prisma.banner.create({
      data: { url: 'https://test.com/banner.png' }
    });
    return { semester, thematic, banner };
  }

  describe('POST /api/saes', () => {
    it('devrait permettre à un administrateur de créer une SAE', async () => {
      const { sessionToken } = await setup.createTestUser(UserRole.ADMIN);
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      const { semester, thematic, banner } = await createBasics();

      const response = await request(app.getHttpServer())
        .post('/api/saes')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          title: 'Nouvelle SAE',
          description: 'Une super SAE',
          semesterId: semester.id,
          teacherId: teacher.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          startDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 86400000).toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Nouvelle SAE');
    });

    it('devrait interdire à un enseignant de créer une SAE', async () => {
      const { sessionToken } = await setup.createTestUser(UserRole.TEACHER);
      const response = await request(app.getHttpServer())
        .post('/api/saes')
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ title: 'SAE Illégale' });

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/saes', () => {
    it('devrait lister les SAE publiées pour le public', async () => {
      const { semester, thematic, banner } = await createBasics();
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      
      await setup.prisma.sae.create({
        data: {
          title: 'SAE Publiée',
          description: 'Desc',
          semesterId: semester.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          createdById: teacher.id,
          startDate: new Date(Date.now() - 3600000),
          dueDate: new Date(Date.now() + 3600000),
          isPublished: true,
        }
      });

      const response = await request(app.getHttpServer()).get('/api/saes');
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('devrait masquer les SAE en brouillon pour le public', async () => {
      const { semester, thematic, banner } = await createBasics();
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      
      await setup.prisma.sae.create({
        data: {
          title: 'SAE Brouillon',
          description: 'Desc',
          semesterId: semester.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          createdById: teacher.id,
          startDate: new Date(),
          dueDate: new Date(),
          isPublished: false,
        }
      });

      const response = await request(app.getHttpServer()).get('/api/saes');
      const found = response.body.data.find((s: any) => s.title === 'SAE Brouillon');
      expect(found).toBeUndefined();
    });
  });

  describe('PATCH /api/saes/:id', () => {
    it('devrait permettre au propriétaire de modifier la SAE', async () => {
      const { user: teacher, sessionToken } = await setup.createTestUser(UserRole.TEACHER);
      const { semester, thematic, banner } = await createBasics();
      
      const sae = await setup.prisma.sae.create({
        data: {
          title: 'Ancien Titre',
          description: 'Desc',
          semesterId: semester.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          createdById: teacher.id,
          startDate: new Date(),
          dueDate: new Date(),
        }
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/saes/${sae.id}`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ title: 'Titre Modifié' });

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.title).toBe('Titre Modifié');
    });
  });

  describe('POST /api/saes/:id/publish', () => {
    it('devrait permettre au propriétaire de publier la SAE', async () => {
      const { user: teacher, sessionToken } = await setup.createTestUser(UserRole.TEACHER);
      const { semester, thematic, banner } = await createBasics();
      
      const sae = await setup.prisma.sae.create({
        data: {
          title: 'Brouillon à publier',
          description: 'Desc',
          semesterId: semester.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          createdById: teacher.id,
          startDate: new Date(),
          dueDate: new Date(),
          isPublished: false,
        }
      });

      const response = await request(app.getHttpServer())
        .post(`/api/saes/${sae.id}/publish`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.isPublished).toBe(true);
    });
  });

  describe('DELETE /api/saes/:id', () => {
    it('devrait permettre à un administrateur de supprimer une SAE (soft delete)', async () => {
      const { sessionToken } = await setup.createTestUser(UserRole.ADMIN);
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      const { semester, thematic, banner } = await createBasics();
      
      const sae = await setup.prisma.sae.create({
        data: {
          title: 'À supprimer',
          description: 'Desc',
          semesterId: semester.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          createdById: teacher.id,
          startDate: new Date(),
          dueDate: new Date(),
        }
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/saes/${sae.id}`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      
      const deletedSae = await setup.prisma.sae.findUnique({ where: { id: sae.id } });
      expect(deletedSae?.deletedAt).not.toBeNull();
    });
  });

  describe('Invitations SAE', () => {
    it('devrait permettre au propriétaire d\'inviter un collègue', async () => {
      const { user: owner, sessionToken } = await setup.createTestUser(UserRole.TEACHER);
      const { user: guest } = await setup.createTestUser(UserRole.TEACHER);
      const { semester, thematic, banner } = await createBasics();
      
      const sae = await setup.prisma.sae.create({
        data: {
          title: 'SAE Collaborative',
          description: 'Desc',
          semesterId: semester.id,
          thematicId: thematic.id,
          bannerId: banner.id,
          createdById: owner.id,
          startDate: new Date(),
          dueDate: new Date(),
        }
      });

      const response = await request(app.getHttpServer())
        .post(`/api/saes/${sae.id}/invitations`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ userId: guest.id });

      expect([200, 201, 204]).toContain(response.status);
      
      const invitation = await setup.prisma.saeInvitation.findFirst({
        where: { saeId: sae.id, userId: guest.id }
      });
      expect(invitation).toBeDefined();
    });
  });
});
