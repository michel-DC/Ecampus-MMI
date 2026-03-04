import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(
    '📜 Génération des archives historiques réalistes (2021-2023)...',
  );

  // IDs fournis par l'utilisateur
  const BANNER_ID = '1bbfa824-fd8a-432a-ab2d-969d2d35c8ef';
  const THEMATIC_IDS = {
    WEB: '3f4b204a-262a-4922-aa0e-f41b82abb033',
    UX: '1e181751-707d-4872-b911-14a4276b2488',
    COM: 'ef4343fd-c318-479e-9677-84a660fd6e2b',
    AV: 'bb044067-48ec-4314-9137-66396653e080',
  };

  // 1. Création d'un nouvel enseignant dédié aux archives
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

  // 2. Création des Étudiants Réalistes (uniques pour ces archives)
  const studentsData = [
    { name: 'Lucas Martin', email: 'lucas.martin.2023@mmi.fr' },
    { name: 'Emma Bernard', email: 'emma.bernard.2023@mmi.fr' },
    { name: 'Thomas Petit', email: 'thomas.petit.2022@mmi.fr' },
    { name: 'Léa Durand', email: 'lea.durand.2022@mmi.fr' },
    { name: 'Hugo Leroy', email: 'hugo.leroy.2021@mmi.fr' },
    { name: 'Chloé Moreau', email: 'chloe.moreau.2021@mmi.fr' },
  ];

  const students = await Promise.all(
    studentsData.map((s) =>
      prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: { ...s, role: UserRole.STUDENT },
      }),
    ),
  );

  // 3. ARCHIVES 2023
  const promo2023 = await prisma.promotion.create({
    data: { label: 'Promotion 2023', academicYear: 2023, isActive: false },
  });
  const sem2023 = await prisma.semester.create({
    data: { number: 4, promotionId: promo2023.id },
  });

  // Travail 1 (2023): Design
  const saeUX23 = await prisma.sae.create({
    data: {
      title: 'Redesign App Transport',
      description:
        "Refonte complète de l'expérience utilisateur pour l'app de bus locale.",
      bannerId: BANNER_ID,
      thematicId: THEMATIC_IDS.UX,
      semesterId: sem2023.id,
      createdById: archiveTeacher.id,
      startDate: new Date('2023-01-10'),
      dueDate: new Date('2023-03-20'),
      isPublished: true,
    },
  });
  await prisma.studentSubmission.create({
    data: {
      saeId: saeUX23.id,
      studentId: students[0].id,
      url: 'https://behance.net/gallery/transport-2023',
      name: 'Etude de cas sur le transport',
      mimeType: 'application/pdf',
      description:
        'Étude UX approfondie et prototypes haute fidélité sous Figma.',
      imageUrl: 'https://images.unsplash.com/photo-1586717791821-3f44a563cc4c',
    },
  });

  // Travail 2 (2023): Web
  const saeWeb23 = await prisma.sae.create({
    data: {
      title: 'E-commerce Durable',
      description:
        "Développement d'une boutique en ligne de produits éco-responsables.",
      bannerId: BANNER_ID,
      thematicId: THEMATIC_IDS.WEB,
      semesterId: sem2023.id,
      createdById: archiveTeacher.id,
      startDate: new Date('2023-04-01'),
      dueDate: new Date('2023-06-15'),
      isPublished: true,
    },
  });
  await prisma.studentSubmission.create({
    data: {
      saeId: saeWeb23.id,
      studentId: students[1].id,
      url: 'https://github.com/mmi/eco-shop-2023',
      name: 'Projet React + Vite',
      mimeType: 'application/zip',
      description: 'Boutique Fullstack développée avec le framework Next.js.',
      imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
    },
  });

  // 4. ARCHIVES 2022
  const promo2022 = await prisma.promotion.create({
    data: { label: 'Promotion 2022', academicYear: 2022, isActive: false },
  });
  const sem2022 = await prisma.semester.create({
    data: { number: 4, promotionId: promo2022.id },
  });

  // Travail 1 (2022): COM
  const saeCom22 = await prisma.sae.create({
    data: {
      title: 'Campagne Festival Cinéma',
      description:
        'Stratégie de communication 360 pour un festival de courts-métrages.',
      bannerId: BANNER_ID,
      thematicId: THEMATIC_IDS.COM,
      semesterId: sem2022.id,
      createdById: archiveTeacher.id,
      startDate: new Date('2022-02-15'),
      dueDate: new Date('2022-05-10'),
      isPublished: true,
    },
  });
  await prisma.studentSubmission.create({
    data: {
      saeId: saeCom22.id,
      studentId: students[2].id,
      url: 'https://mmi.fr/com-2022/festival',
      name: 'Stratégie Festival',
      mimeType: 'application/pdf',
      description:
        'Dossier stratégique incluant planning réseaux sociaux et visuels print.',
      imageUrl: 'https://images.unsplash.com/photo-1542204172-3c1f81d88d3c',
    },
  });

  // Travail 2 (2022): AV
  const saeAV22 = await prisma.sae.create({
    data: {
      title: 'Court-métrage Expérimental',
      description: "Réalisation d'une vidéo de 3 minutes sur le thème Demain.",
      bannerId: BANNER_ID,
      thematicId: THEMATIC_IDS.AV,
      semesterId: sem2022.id,
      createdById: archiveTeacher.id,
      startDate: new Date('2022-09-01'),
      dueDate: new Date('2022-12-15'),
      isPublished: true,
    },
  });
  await prisma.studentSubmission.create({
    data: {
      saeId: saeAV22.id,
      studentId: students[3].id,
      url: 'https://vimeo.com/mmi/demain-2022',
      name: 'Montage Final',
      mimeType: 'video/mp4',
      description:
        'Exploration visuelle mixant prises de vues réelles et motion design.',
      imageUrl: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7',
    },
  });

  // 5. ARCHIVES 2021
  const promo2021 = await prisma.promotion.create({
    data: { label: 'Promotion 2021', academicYear: 2021, isActive: false },
  });
  const sem2021 = await prisma.semester.create({
    data: { number: 4, promotionId: promo2021.id },
  });

  // Travail 1 (2021): Identité
  const saeId21 = await prisma.sae.create({
    data: {
      title: 'Identité Brasserie Artisanale',
      description:
        'Création du logo, packaging et site vitrine pour une brasserie.',
      bannerId: BANNER_ID,
      thematicId: THEMATIC_IDS.UX,
      semesterId: sem2021.id,
      createdById: archiveTeacher.id,
      startDate: new Date('2021-01-20'),
      dueDate: new Date('2021-04-30'),
      isPublished: true,
    },
  });
  await prisma.studentSubmission.create({
    data: {
      saeId: saeId21.id,
      studentId: students[4].id,
      url: 'https://archive.mmi.fr/2021/brasserie',
      name: 'Charte Graphique Brasserie',
      mimeType: 'application/pdf',
      description:
        'Identité visuelle complète incluant étiquettes et mockup boutique.',
      imageUrl: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62',
    },
  });

  // Travail 2 (2021): Web
  const saeGame21 = await prisma.sae.create({
    data: {
      title: 'Jeu Plateforme 2D',
      description:
        "Développement d'un jeu de plateforme complet sous Unity ou Phaser.",
      bannerId: BANNER_ID,
      thematicId: THEMATIC_IDS.WEB,
      semesterId: sem2021.id,
      createdById: archiveTeacher.id,
      startDate: new Date('2021-05-01'),
      dueDate: new Date('2021-07-15'),
      isPublished: true,
    },
  });
  await prisma.studentSubmission.create({
    data: {
      saeId: saeGame21.id,
      studentId: students[5].id,
      url: 'https://itch.io/mmi/game-2021',
      name: 'Jeu Plateforme 2D',
      mimeType: 'application/zip',
      description:
        'Jeu de plateforme rétro avec 3 niveaux et système de score.',
      imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f',
    },
  });

  console.log(
    '✅ Archives 2021-2023 générées avec succès avec un nouvel enseignant et vos IDs.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
