import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: 'demo-volleyball' },
    update: {},
    create: {
      name: 'Demo Volleyball League',
      slug: 'demo-volleyball',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@volleyball.local' },
    update: {},
    create: {
      organizationId: org.id,
      email: 'admin@volleyball.local',
      displayName: 'League Admin',
      isPlatformAdmin: true,
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
