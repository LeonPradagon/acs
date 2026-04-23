import { prisma } from "../src/config/db";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Menjalankan seed database...");

  // ===== Hapus data lama (opsional, sesuaikan kebutuhan) =====
  // await prisma.user.deleteMany();

  // ===== Buat akun Admin =====
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      password: adminPassword,
      role: "admin",
      name: "Admin",
    },
    create: {
      email: "admin",
      password: adminPassword,
      name: "Admin",
      role: "admin",
    },
  });
  console.log(`Akun terbuat: ${admin.name} (Login ID: ${admin.email}, Role: ${admin.role})`);

  // ===== Buat akun demo_pdsi =====
  const demoPassword = await bcrypt.hash("Rahasia2$$", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo_pdsi" },
    update: {
      password: demoPassword,
      role: "user",
      name: "Demo PDSI",
    },
    create: {
      email: "demo_pdsi",
      password: demoPassword,
      name: "Demo PDSI",
      role: "user",
    },
  });
  console.log(`Akun terbuat: ${demoUser.name} (Login ID: ${demoUser.email}, Role: ${demoUser.role})`);

  console.log("Seed database selesai. ✅");
}

main()
  .catch((e) => {
    console.error("Terjadi error saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
