import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sql = `
ALTER TABLE "Document" DROP CONSTRAINT "Document_folderId_fkey";
ALTER TABLE "File" DROP CONSTRAINT "File_folderId_fkey";
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
`;

async function main() {
  const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
  for (const statement of statements) {
    console.log('Executing:', statement);
    await prisma.$executeRawUnsafe(statement);
  }
  console.log('Migration applied successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
