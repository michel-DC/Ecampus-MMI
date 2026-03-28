import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestSetup } from './utils/test-setup';
import request from 'supertest';
import { UserRole } from '@prisma/client';

describe('Module des Rendus (e2e)', () => {
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

  async function createSae(ownerId: string) {
    const prisma = setup.prisma;
    const promotion = await prisma.promotion.create({ data: { label: 'MMI 1', academicYear: null } });
    const group = await prisma.group.create({ data: { name: 'A1' } });
    const semester = await prisma.semester.create({ data: { number: 1, promotionId: promotion.id } });
    const thematic = await prisma.thematic.create({ data: { code: 'UX', label: 'UX Design' } });
    const banner = await prisma.banner.create({ data: { url: 'https://test.com/b.png' } });
    
    return { sae: await prisma.sae.create({
      data: {
        title: 'SAE Test Rendus',
        description: 'Desc',
        semesterId: semester.id,
        thematicId: thematic.id,
        bannerId: banner.id,
        createdById: ownerId,
        startDate: new Date(),
        dueDate: new Date(Date.now() + 86400000),
        isPublished: true,
      }
    }), promotion, group };
  }

  describe('POST /api/saes/:saeId/submission', () => {
    it('devrait permettre à un étudiant de rendre son travail', async () => {
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      const { user: student, sessionToken } = await setup.createTestUser(UserRole.STUDENT);
      const { sae, promotion, group } = await createSae(teacher.id);

      await setup.prisma.studentProfile.create({
        data: { userId: student.id, promotionId: promotion.id, groupId: group.id, isValidated: true }
      });

      const response = await request(app.getHttpServer())
        .post(`/api/saes/${sae.id}/submission`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({
          url: 'https://test.com/mon-travail.pdf',
          fileName: 'travail.pdf',
          mimeType: 'application/pdf',
          description: 'Mon projet final',
          isPublic: true
        });

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.url).toBe('https://test.com/mon-travail.pdf');
    });
  });

  describe('GET /api/saes/:saeId/submission/me', () => {
    it('devrait retourner mon propre rendu', async () => {
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      const { user: student, sessionToken } = await setup.createTestUser(UserRole.STUDENT);
      const { sae, promotion, group } = await createSae(teacher.id);

      await setup.prisma.studentProfile.create({
        data: { userId: student.id, promotionId: promotion.id, groupId: group.id, isValidated: true }
      });

      await setup.prisma.studentSubmission.create({
        data: {
          saeId: sae.id,
          studentId: student.id,
          url: 'https://test.com/rendu.pdf',
          name: 'rendu.pdf',
          mimeType: 'application/pdf',
          description: 'Mon rendu'
        }
      });

      const response = await request(app.getHttpServer())
        .get(`/api/saes/${sae.id}/submission/me`)
        .set('Authorization', `Bearer ${sessionToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.url).toBe('https://test.com/rendu.pdf');
    });
  });

  describe('PATCH /api/saes/:saeId/submission/visibility', () => {
    it('devrait permettre à l\'étudiant de modifier la visibilité', async () => {
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      const { user: student, sessionToken } = await setup.createTestUser(UserRole.STUDENT);
      const { sae, promotion, group } = await createSae(teacher.id);

      await setup.prisma.studentProfile.create({
        data: { userId: student.id, promotionId: promotion.id, groupId: group.id, isValidated: true }
      });

      await setup.prisma.studentSubmission.create({
        data: {
          saeId: sae.id,
          studentId: student.id,
          url: 'https://test.com/vis.pdf',
          name: 'vis.pdf',
          mimeType: 'application/pdf',
          description: 'Travail',
          isPublic: false
        }
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/saes/${sae.id}/submission/visibility`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ isPublic: true });

      expect(response.status).toBe(200);
      expect(response.body.data.isPublic).toBe(true);
    });
  });
});
