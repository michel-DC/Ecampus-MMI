import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestSetup } from './utils/test-setup';
import request from 'supertest';
import { UserRole } from '@prisma/client';

describe('Module Notation et Paliers (e2e)', () => {
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

  async function createSaeFinished(ownerId: string) {
    const prisma = setup.prisma;
    const promotion = await prisma.promotion.create({ data: { label: 'MMI 1', academicYear: null } });
    const group = await prisma.group.create({ data: { name: 'A1' } });
    const semester = await prisma.semester.create({ data: { number: 1, promotionId: promotion.id } });
    const thematic = await prisma.thematic.create({ data: { code: 'DEV', label: 'Dev' } });
    const banner = await prisma.banner.create({ data: { url: 'https://test.com/b.png' } });
    
    return { sae: await prisma.sae.create({
      data: {
        title: 'SAE Terminée',
        description: 'Desc',
        semesterId: semester.id,
        thematicId: thematic.id,
        bannerId: banner.id,
        createdById: ownerId,
        startDate: new Date(Date.now() - 86400000 * 2),
        dueDate: new Date(Date.now() - 3600000),
        isPublished: true,
      }
    }), promotion, group };
  }

  describe('Catégories de Notes', () => {
    it('devrait permettre à l\'enseignant de créer une catégorie de note après la date limite', async () => {
      const { user: teacher, sessionToken } = await setup.createTestUser(UserRole.TEACHER);
      const { sae } = await createSaeFinished(teacher.id);

      const response = await request(app.getHttpServer())
        .post(`/api/saes/${sae.id}/grade-categories`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ name: 'Qualité du Code' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Qualité du Code');
    });
  });

  describe('Paliers (Milestones)', () => {
    it('devrait permettre à l\'étudiant de mettre à jour sa progression sur un palier', async () => {
      const { user: teacher } = await setup.createTestUser(UserRole.TEACHER);
      const { user: student, sessionToken } = await setup.createTestUser(UserRole.STUDENT);
      const { sae, promotion, group } = await createSaeFinished(teacher.id);
      
      await setup.prisma.studentProfile.create({
        data: { userId: student.id, promotionId: promotion.id, groupId: group.id, isValidated: true }
      });

      const milestone = await setup.prisma.saeMilestone.create({
        data: {
          title: 'Étape 1',
          saeId: sae.id,
          position: 1
        }
      });

      const response = await request(app.getHttpServer())
        .post(`/api/saes/${sae.id}/milestones/${milestone.id}/progress`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ isReached: true, message: 'Fait !' });

      expect([200, 201]).toContain(response.status);
      expect(response.body.data.isReached).toBe(true);
    });
  });
});
