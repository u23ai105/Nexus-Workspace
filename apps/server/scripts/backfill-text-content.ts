import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';

const prisma = new PrismaClient();

async function backfillTextContent() {
  const documents = await prisma.document.findMany({
    where: {
      type: 'TEXT',
      yjsState: { not: null }
    }
  });

  let updated = 0;

  for (const doc of documents) {
    if (doc.yjsState) {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState));
      
      try {
        const xml = ydoc.getXmlFragment('default');
        const rawString = xml.toString();
        if (rawString) {
          const textContent = rawString.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          if (textContent && textContent.length > 0) {
            await prisma.document.update({
              where: { id: doc.id },
              data: { textContent }
            });
            updated++;
          }
        }
      } catch (e) {
        console.error(`Failed to backfill document ${doc.id}`);
      }
    }
  }

  console.log(`Backfill complete. Updated ${updated} documents.`);
}

backfillTextContent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
