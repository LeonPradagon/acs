
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  let output = '--- Inspecting Database ---\n';
  
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true }
  });
  output += `\nUsers found: ${users.length}\n`;
  users.forEach(u => output += `- ${u.name} (${u.email}): ${u.id}\n`);
  
  const sessions = await prisma.chatSession.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { messages: true }
      }
    }
  });
  
  output += '\nRecent Sessions (last 20):\n';
  sessions.forEach(s => {
    output += `- ID: ${s.id}\n`;
    output += `  Title: ${s.title}\n`;
    output += `  User ID: ${s.userId || 'NULL'}\n`;
    output += `  Messages: ${s._count.messages}\n`;
    output += `  Created: ${s.createdAt}\n`;
  });

  const nullUserSessionsCount = await prisma.chatSession.count({
    where: { userId: null }
  });
  output += `\nSessions with NULL userId: ${nullUserSessionsCount}\n`;

  const totalSessions = await prisma.chatSession.count();
  output += `Total Sessions: ${totalSessions}\n`;

  fs.writeFileSync('inspect_output.txt', output);
  console.log('Inspection complete. Output written to inspect_output.txt');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
