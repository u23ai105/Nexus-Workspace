import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting migration...');
  
  const workspaces = await prisma.workspace.findMany();
  
  let count = 0;
  for (const workspace of workspaces) {
    // Check if member already exists
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: workspace.ownerId,
          workspaceId: workspace.id,
        }
      }
    });

    if (!existing) {
      await prisma.workspaceMember.create({
        data: {
          userId: workspace.ownerId,
          workspaceId: workspace.id,
          role: 'OWNER'
        }
      });
      count++;
      console.log(`Migrated owner for workspace ${workspace.id}`);
    }
  }

  console.log(`Migration complete. Backfilled ${count} workspaces.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
