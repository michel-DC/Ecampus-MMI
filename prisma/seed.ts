import { PrismaClient, UserRole, DocumentType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Nettoyage complet
  await prisma.studentSubmission.deleteMany();
  await prisma.saeDocument.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.saeInvitation.deleteMany();
  await prisma.sae.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.thematic.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  // 1. Création des Thématiques
  const thematics = await Promise.all([
    prisma.thematic.create({ data: { code: 'WEB', label: 'Développement Web' } }),
    prisma.thematic.create({ data: { code: 'UX', label: 'UX/UI Design' } }),
    prisma.thematic.create({ data: { code: 'AV', label: 'Audiovisuel' } }),
  ]);

  // 2. Création des Bannières
  const banners = await Promise.all([
    prisma.banner.create({ data: { url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085' } }),
    prisma.banner.create({ data: { url: 'https://images.unsplash.com/photo-1586717791821-3f44a563cc4c' } }),
  ]);

  // 3. Création des Groupes transverses
  const groups = await Promise.all([
    prisma.group.create({ data: { name: 'A1' } }),
    prisma.group.create({ data: { name: 'B1' } }),
  ]);

  // 4. Utilisateurs (Prof et Élève)
  const teacher = await prisma.user.create({
    data: {
      email: 'prof@mmi.fr',
      name: 'M. Professeur',
      role: UserRole.TEACHER,
      teacherProfile: { create: {} },
    },
  });

  const student = await prisma.user.create({
    data: {
      email: 'student@mmi.fr',
      name: 'Alice Student',
      role: UserRole.STUDENT,
    },
  });

  // --- PROMOTIONS ACTUELLES ---
  const currentPromos = await Promise.all([
    prisma.promotion.create({ data: { label: 'MMI1', yearLevel: 1 } }),
    prisma.promotion.create({ data: { label: 'MMI2', yearLevel: 2 } }),
  ]);

  // Semestres actuels
  const currentSemesters = await Promise.all([
    prisma.semester.create({ data: { number: 1, promotionId: currentPromos[0].id } }),
    prisma.semester.create({ data: { number: 3, promotionId: currentPromos[1].id } }),
  ]);

  // Profil Alice (en MMI2)
  await prisma.studentProfile.create({
    data: {
      userId: student.id,
      promotionId: currentPromos[1].id,
      groupId: groups[0].id,
    },
  });

  // --- ARCHIVES (PROMOS PASSÉES) ---
  const pastPromo2024 = await prisma.promotion.create({
    data: { label: 'Promo 2024', academicYear: 2024 },
  });

  const pastSemester = await prisma.semester.create({
    data: { number: 4, promotionId: pastPromo2024.id },
  });

  // Une SAE archivée de 2024
  const oldSae = await prisma.sae.create({
    data: {
      title: 'Projet Web 2024',
      description: 'Ancien projet historique.',
      bannerId: banners[0].id,
      thematicId: thematics[0].id,
      semesterId: pastSemester.id,
      createdById: teacher.id,
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-06-01'),
      isPublished: true,
    },
  });

  // Un rendu archivé pour la galerie graphique
  await prisma.studentSubmission.create({
    data: {
      saeId: oldSae.id,
      studentId: student.id,
      url: 'https://archive.com/projet.zip',
      name: 'Rendu 2024.zip',
      mimeType: 'application/zip',
      description: 'Voici le travail primé de la promotion 2024.',
      imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c', // Image pour la galerie
    },
  });

  console.log('✅ Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
