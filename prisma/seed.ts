import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // Nettoyage des données existantes
  await prisma.saeInvitation.deleteMany();
  await prisma.sae.deleteMany();
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

  // 2. Création des Promotions
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

  // 3. Création des Groupes
  const groups = ['GROUPEA1', 'GROUPEA2', 'GROUPEB1', 'GROUPEB2'];
  for (const name of groups) {
    await prisma.group.create({
      data: { name },
    });
  }
  console.log('✅ Groups created');

  // 4. Création des Semestres liés aux promotions
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
