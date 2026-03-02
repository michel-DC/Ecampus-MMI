import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Nettoyage des données existantes
  await prisma.saeInvitation.deleteMany();
  await prisma.sae.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.thematic.deleteMany();
  await prisma.semester.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.group.deleteMany();
  await prisma.promotion.deleteMany();

  // 1. Création des Thématiques
  const thematicsData = [
    { code: 'DEVELOPPEMENT_WEB', label: 'Développement Web' },
    { code: 'UX_UI_DESIGN', label: 'UX/UI Design' },
    { code: 'DESIGN_GRAPHIQUE', label: 'Design Graphique' },
    { code: 'PRODUCTION_AUDIOVISUELLE', label: 'Production Audiovisuelle' },
    { code: 'MOTION_DESIGN', label: 'Motion Design' },
    { code: '3D', label: '3D' },
    { code: 'COMMUNICATION_STRATEGIQUE', label: 'Communication Stratégique' },
    { code: 'GESTION_DE_PROJET', label: 'Gestion de Projet' },
    { code: 'DROIT_DU_NUMERIQUE', label: 'Droit du Numérique' },
    { code: 'ECONOMIE_ET_ENTREPRENEURIAT', label: 'Économie et Entrepreneuriat' },
  ];

  for (const thematic of thematicsData) {
    await prisma.thematic.create({
      data: thematic,
    });
  }
  console.log('✅ Thematics created');

  // 2. Création des Bannières
  const bannersData = [
    'https://i.pinimg.com/1200x/ed/94/eb/ed94ebdd0efc7287c494656e7731f018.jpg',
    'https://i.pinimg.com/1200x/f8/db/1c/f8db1ce0ceed526da4d3283f4c4f1b81.jpg',
    'https://i.pinimg.com/1200x/72/8c/4a/728c4abf711c48935b28236a2120a1e5.jpg',
    'https://i.pinimg.com/1200x/9e/04/a6/9e04a6ea0ad7520b1faa48f93aa57988.jpg',
    'https://i.pinimg.com/736x/5e/d9/a8/5ed9a8052fd4be135daa9c607a80258a.jpg',
    'https://i.pinimg.com/1200x/f2/9f/7a/f29f7af6b35e675f2902acd33c7c6e17.jpg',
    'https://i.pinimg.com/736x/00/dd/39/00dd39ffb231b590f3cbc00d3634ba03.jpg',
    'https://i.pinimg.com/736x/1e/12/94/1e129492f8c32810e72f338475b4334f.jpg',
  ];

  for (const url of bannersData) {
    await prisma.banner.create({
      data: { url },
    });
  }
  console.log('✅ Banners created');

  // 3. Création des Promotions
  const mmi1 = await prisma.promotion.create({
    data: { label: 'MMI1', yearLevel: 1 },
  });
  const mmi2 = await prisma.promotion.create({
    data: { label: 'MMI2', yearLevel: 2 },
  });
  const mmi3 = await prisma.promotion.create({
    data: { label: 'MMI3', yearLevel: 3 },
  });
  console.log('✅ Promotions created');

  // 4. Création des Groupes
  const groups = ['GROUPEA1', 'GROUPEA2', 'GROUPEB1', 'GROUPEB2'];
  for (const name of groups) {
    await prisma.group.create({
      data: { name },
    });
  }
  console.log('✅ Groups created');

  // 5. Création des Semestres liés aux promotions
  const semesters = [
    { number: 1, promotionId: mmi1.id },
    { number: 2, promotionId: mmi1.id },
    { number: 3, promotionId: mmi2.id },
    { number: 4, promotionId: mmi2.id },
    { number: 5, promotionId: mmi3.id },
    { number: 6, promotionId: mmi3.id },
  ];

  for (const semester of semesters) {
    await prisma.semester.create({
      data: semester,
    });
  }
  console.log('✅ Semesters created');

  console.log('🌳 Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
