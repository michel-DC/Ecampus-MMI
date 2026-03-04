import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📜 Génération COMPLÈTE des archives historiques (2021-2023)...');

  // 1. IDs fournis par l'utilisateur
  const BANNER_ID = '1bbfa824-fd8a-432a-ab2d-969d2d35c8ef';
  const THEMATIC_IDS = {
    WEB: '3f4b204a-262a-4922-aa0e-f41b82abb033',
    UX: '1e181751-707d-4872-b911-14a4276b2488',
    COM: 'ef4343fd-c318-479e-9677-84a660fd6e2b',
    AV: 'bb044067-48ec-4314-9137-66396653e080',
  };

  // 2. Récupération du groupe par défaut
  const group = await prisma.group.findFirst({ where: { name: 'GROUPE-A1' } });
  if (!group) {
    throw new Error('Aucun groupe "GROUPEA1" trouvé. Merci de lancer le seed principal.');
  }

  // 3. Création de l'enseignant dédié aux archives
  const archiveTeacher = await prisma.user.upsert({
    where: { email: 'archives.mmi@univ-mmi.fr' },
    update: {},
    create: {
      email: 'archives.mmi@univ-mmi.fr',
      name: 'Responsable Archives',
      role: UserRole.TEACHER,
      teacherProfile: { create: {} },
    },
  });

  // 4. Création des Étudiants et de leurs Profils
  const years = [2023, 2022, 2021];
  const studentsData = {
    2023: [
      { name: 'Lucas Martin', email: 'lucas.martin.2023@mmi.fr' },
      { name: 'Emma Bernard', email: 'emma.bernard.2023@mmi.fr' },
    ],
    2022: [
      { name: 'Thomas Petit', email: 'thomas.petit.2022@mmi.fr' },
      { name: 'Léa Durand', email: 'lea.durand.2022@mmi.fr' },
    ],
    2021: [
      { name: 'Hugo Leroy', email: 'hugo.leroy.2021@mmi.fr' },
      { name: 'Chloé Moreau', email: 'chloe.moreau.2021@mmi.fr' },
    ],
  };

  for (const year of years) {
    // Création de la Promotion
    const promo = await prisma.promotion.upsert({
      where: { id: `promo-${year}-id` },
      update: { academicYear: year, isActive: false },
      create: {
        id: `promo-${year}-id`,
        label: `Promotion ${year}`,
        academicYear: year,
        isActive: false,
      },
    });

    const semester = await prisma.semester.create({
      data: { number: 4, promotionId: promo.id },
    });

    // Création des étudiants et profils pour cette année
    const yearStudents = studentsData[year as keyof typeof studentsData];
    for (const sData of yearStudents) {
      const user = await prisma.user.upsert({
        where: { email: sData.email },
        update: {},
        create: { ...sData, role: UserRole.STUDENT },
      });

      await prisma.studentProfile.upsert({
        where: { userId: user.id },
        update: { promotionId: promo.id, groupId: group.id },
        create: { userId: user.id, promotionId: promo.id, groupId: group.id },
      });

      // Ajout d'une SAE et d'un rendu pour chaque étudiant pour remplir l'historique
      const isFirst = yearStudents.indexOf(sData) === 0;
      const thematicId = isFirst ? THEMATIC_IDS.UX : THEMATIC_IDS.WEB;
      const title = isFirst ? `Projet Design ${year}` : `Projet Web ${year}`;

      const sae = await prisma.sae.create({
        data: {
          title,
          description: `Travail d'archive de l'année ${year}.`,
          bannerId: BANNER_ID,
          thematicId,
          semesterId: semester.id,
          createdById: archiveTeacher.id,
          startDate: new Date(`${year}-01-01`),
          dueDate: new Date(`${year}-06-01`),
          isPublished: true,
        },
      });

      await prisma.studentSubmission.create({
        data: {
          saeId: sae.id,
          studentId: user.id,
          url: `https://archive.mmi.fr/${year}/travail.zip`,
          name: `Projet_${year}.zip`,
          mimeType: 'application/zip',
          description: `Rendu final de ${user.name} pour la promotion ${year}.`,
          imageUrl: isFirst
            ? 'https://images.unsplash.com/photo-1555066931-4365d14bab8c'
            : 'https://images.unsplash.com/photo-1542204172-3c1f81d88d3c',
        },
      });
    }
  }

  console.log('✨ Base de données mise à jour avec toutes les archives (Users + Profiles + SAE + Rendus).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
