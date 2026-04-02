import { PrismaClient } from '@prisma/client';
import { hashPassword } from 'better-auth/crypto'; // Import direct de l'utilitaire Better Auth

const prisma = new PrismaClient();

async function main() {
  const email = 'prof@gmail.com';
  const newPasswordRaw = 'michel000p';

  console.log(`--- Mise à jour du mot de passe pour ${email} ---`);

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    console.error('❌ Utilisateur non trouvé.');
    return;
  }

  // Utilisation de la fonction native de Better Auth
  // Elle gère le sel et le formatage exact attendu (Argon2id)
  const hashedPassword = await hashPassword(newPasswordRaw);

  try {
    const updatedAccount = await prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
      data: {
        password: hashedPassword,
      },
    });

    if (updatedAccount.count > 0) {
      console.log('✅ Mot de passe mis à jour avec le format Better Auth !');
    } else {
      console.error(
        "❌ Aucun compte 'credential' trouvé pour cet utilisateur.",
      );
    }
  } catch (error) {
    console.error('❌ Erreur Prisma :', error.message);
  }
}

main().finally(async () => await prisma.$disconnect());
