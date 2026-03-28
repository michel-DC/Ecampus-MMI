import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestSetup } from './utils/test-setup';
import request from 'supertest';
import { UserRole } from '@prisma/client';

describe('Module Utilisateurs et Annonces (e2e)', () => {
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

  describe('Validation des Utilisateurs', () => {
    it('devrait permettre à un administrateur de valider le profil d\'un étudiant', async () => {
      const { sessionToken: adminToken } = await setup.createTestUser(UserRole.ADMIN);
      const { user: student } = await setup.createTestUser(UserRole.STUDENT);
      
      const prisma = setup.prisma;
      const promotion = await prisma.promotion.create({ data: { label: 'M1', academicYear: null } });
      const group = await prisma.group.create({ data: { name: 'A1' } });
      
      await prisma.studentProfile.create({
        data: { userId: student.id, promotionId: promotion.id, groupId: group.id }
      });

      const response = await request(app.getHttpServer())
        .post(`/api/users/${student.id}/validate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 201]).toContain(response.status);
      
      const profile = await prisma.studentProfile.findUnique({ where: { userId: student.id } });
      expect(profile?.isValidated).toBe(true);
    });
  });

  describe('Annonces', () => {
    it('devrait permettre à l\'enseignant propriétaire de créer une annonce', async () => {
      const { user: teacher, sessionToken } = await setup.createTestUser(UserRole.TEACHER);
      
      const prisma = setup.prisma;
      const promotion = await prisma.promotion.create({ data: { label: 'M1', academicYear: null } });
      const semester = await prisma.semester.create({ data: { number: 1, promotionId: promotion.id } });
      const thematic = await prisma.thematic.create({ data: { code: 'UX', label: 'UX' } });
      const banner = await prisma.banner.create({ data: { url: 'https://test.com/b.png' } });
      
      const sae = await prisma.sae.create({
        data: {
          title: 'Annonce SAE',
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
        .post(`/api/saes/${sae.id}/announcements`)
        .set('Authorization', `Bearer ${sessionToken}`)
        .send({ title: 'Important !', content: 'Cours demain' });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('Important !');
    });
  });
});
