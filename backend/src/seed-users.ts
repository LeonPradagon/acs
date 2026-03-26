import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: "admin", password: "admin123", name: "Admin" },
    { email: "demo_pdsi", password: "Rahasia2$$", name: "Demo PDSI" },
  ];

  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { password: hashedPassword },
      create: {
        email: u.email,
        password: hashedPassword,
        name: u.name,
      },
    });
    console.log(`✅ User "${u.email}" created/updated (id: ${user.id})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
