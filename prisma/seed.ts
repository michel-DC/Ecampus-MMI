import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  await prisma.studentSubmission.deleteMany();
  await prisma.saeDocument.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.saeInvitation.deleteMany();
  await prisma.sae.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.thematic.deleteMany();
  await prisma.group.deleteMany();
  await prisma.promotion.deleteMany();

  const thematics = await Promise.all([
    prisma.thematic.create({
      data: { code: 'WEB', label: 'Développement Web' },
    }),
    prisma.thematic.create({
      data: { code: 'UX', label: 'UX/UI Design' },
    }),
    prisma.thematic.create({
      data: { code: 'AV', label: 'Audiovisuel' },
    }),
    prisma.thematic.create({
      data: { code: 'COM', label: 'Communication' },
    }),
    prisma.thematic.create({
      data: { code: '3D', label: '3D' },
    }),
    prisma.thematic.create({
      data: { code: 'GRAPH', label: 'Graphisme' },
    }),
  ]);

  const banners = await Promise.all([
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/1200x/ed/94/eb/ed94ebdd0efc7287c494656e7731f018.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/1200x/f8/db/1c/f8db1ce0ceed526da4d3283f4c4f1b81.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/1200x/72/8c/4a/728c4abf711c48935b28236a2120a1e5.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/1200x/9e/04/a6/9e04a6ea0ad7520b1faa48f93aa57988.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/736x/5e/d9/a8/5ed9a8052fd4be135daa9c607a80258a.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/1200x/f2/9f/7a/f29f7af6b35e675f2902acd33c7c6e17.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/736x/00/dd/39/00dd39ffb231b590f3cbc00d3634ba03.jpg',
      },
    }),
    prisma.banner.create({
      data: {
        url: 'https://i.pinimg.com/736x/1e/12/94/1e129492f8c32810e72f338475b4334f.jpg',
      },
    }),
  ]);

  const groups = await Promise.all([
    prisma.group.create({ data: { name: 'A1' } }),
    prisma.group.create({ data: { name: 'A2' } }),
    prisma.group.create({ data: { name: 'B1' } }),
    prisma.group.create({ data: { name: 'B2' } }),
  ]);

  const teacher = await prisma.user.create({
    data: {
      email: 'prof@mmi.fr',
      firstname: 'Marc',
      lastname: 'Professeur',
      role: UserRole.TEACHER,
      teacherProfile: { create: {} },
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'student@mmi.fr',
      firstname: 'Alice',
      lastname: 'Student',
      role: UserRole.STUDENT,
    },
  });

  const currentPromos = await Promise.all([
    prisma.promotion.create({ data: { label: 'MMI1', yearLevel: 1 } }),
    prisma.promotion.create({ data: { label: 'MMI2', yearLevel: 2 } }),
    prisma.promotion.create({ data: { label: 'MMI3', yearLevel: 3 } }),
  ]);

  const currentSemesters = await Promise.all([
    prisma.semester.create({
      data: { number: 1, promotionId: currentPromos[0].id },
    }),
    prisma.semester.create({
      data: { number: 2, promotionId: currentPromos[0].id },
    }),
    prisma.semester.create({
      data: { number: 3, promotionId: currentPromos[1].id },
    }),
    prisma.semester.create({
      data: { number: 4, promotionId: currentPromos[1].id },
    }),
    prisma.semester.create({
      data: { number: 5, promotionId: currentPromos[2].id },
    }),
    prisma.semester.create({
      data: { number: 6, promotionId: currentPromos[2].id },
    }),
  ]);

  await prisma.studentProfile.create({
    data: {
      userId: student.id,
      promotionId: currentPromos[1].id,
      groupId: groups[0].id,
    },
  });

  const pastPromotions = await Promise.all([
    prisma.promotion.create({
      data: { label: 'Promotion 2024', academicYear: 2024, isActive: false },
    }),
    prisma.promotion.create({
      data: { label: 'Promotion 2023', academicYear: 2023, isActive: false },
    }),
    prisma.promotion.create({
      data: { label: 'Promotion 2022', academicYear: 2022, isActive: false },
    }),
    prisma.promotion.create({
      data: { label: 'Promotion 2021', academicYear: 2021, isActive: false },
    }),
  ]);

  const pastSemester2024 = await prisma.semester.create({
    data: { number: 6, promotionId: pastPromotions[0].id },
  });

  const archiveSae = await prisma.sae.create({
    data: {
      title: 'Projet Web 2024',
      description: 'Ancien projet historique de la promotion 2024.',
      bannerId: banners[0].id,
      thematicId: thematics[0].id,
      semesterId: pastSemester2024.id,
      createdById: teacher.id,
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-06-01'),
      isPublished: true,
    },
  });

  await prisma.studentSubmission.create({
    data: {
      saeId: archiveSae.id,
      studentId: student.id,
      url: 'https://archive.com/projet-2024.zip',
      name: 'Rendu 2024.zip',
      mimeType: 'application/zip',
      description: 'Voici le travail primé de la promotion 2024.',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c',
    },
  });

  console.log('✅ Seeding finished successfully.');
  console.log(`📊 Thématiques: ${thematics.length}`);
  console.log(`🎨 Bannières: ${banners.length}`);
  console.log(`👥 Groupes: ${groups.length}`);
  console.log(`🎓 Promotions actuelles: ${currentPromos.length}`);
  console.log(`📚 Promotions archivées: ${pastPromotions.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
