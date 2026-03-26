import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  console.log("Starting script to upgrade users to admin...");
  try {
    const users = await prisma.user.updateMany({
      data: { role: 'admin' }
    });
    console.log(`Successfully updated ${users.count} user(s) to 'admin' role in the database.`);
  } catch (err) {
    console.error("Error updating users:", err);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
