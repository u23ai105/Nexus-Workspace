import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting member status migration...');

  // Set all current members to ACCEPTED
  const res = await prisma.workspaceMember.updateMany({
    data: {
      status: 'ACCEPTED'
    }
  });

  console.log(`Migration complete. Updated ${res.count} members.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
