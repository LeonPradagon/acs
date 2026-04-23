import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Ensuring pgvector and DocumentChunk embedding column exist...");
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "embedding" vector(384);`
    );
    console.log("✅ pgvector column verified/restored.");
  } catch (e: any) {
    console.warn("⚠️  Failed to add pgvector column (it might already exist or extension missing). Error:", e.message);
  }

  // 1. Create Divisions
  console.log("Seeding Divisions...");
  const globalIT = await prisma.division.upsert({
    where: { name: "Global IT Division" },
    update: {},
    create: {
      name: "Global IT Division",
      description: "Division for System Administrators",
    },
  });

  const hrDivision = await prisma.division.upsert({
    where: { name: "HR Division" },
    update: {},
    create: {
      name: "HR Division",
      description: "Human Resources",
    },
  });

  // 2. Create Users
  console.log("Seeding Users...");
  const password = "password123";
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      role: "superadmin",
      divisionId: globalIT.id,
    },
    create: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Super Admin User",
      role: "superadmin",
      divisionId: globalIT.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "hradmin@example.com" },
    update: {
      role: "admin",
      divisionId: hrDivision.id,
    },
    create: {
      email: "hradmin@example.com",
      password: hashedPassword,
      name: "HR Admin User",
      role: "admin",
      divisionId: hrDivision.id,
    },
  });
  console.log(`✅ Users admin@example.com and hradmin@example.com are seeded.`);

  // 3. Seed Global Documents (divisionId = null)
  const documents = [
    {
      title: "Profil Perusahaan ASISGO",
      content:
        "ASISGO CORE-SOVEREIGN adalah platform kecerdasan buatan tingkat lanjut yang dirancang untuk analisis data intelijen secara berdaulat (sovereign). Platform ini menggunakan arsitektur hybrid search dan model Groq gpt-oss-120b untuk memberikan akurasi tinggi tanpa halusinasi.",
    },
    {
      title: "Panduan Fitur RAG",
      content:
        "RAG (Retrieval-Augmented Generation) di sistem ini bekerja dengan mengambil data dari Elasticsearch dan PostgreSQL secara bersamaan. Data yang relevan akan disisipkan ke dalam prompt AI sebagai konteks untuk memastikan AI tidak mengarang jawaban.",
    },
    {
      title: "Keamanan Data",
      content:
        "Seluruh data pengguna di platform ini dienkripsi menggunakan standar industri. Password disimpan dalam format Bcrypt hash dan transmisi data dilindungi oleh JWT (JSON Web Token).",
    },
  ];

  for (const doc of documents) {
    const existingDoc = await prisma.document.findFirst({
      where: { title: doc.title },
    });
    if (!existingDoc) {
      // Create as a global document (divisionId = null)
      await prisma.document.create({ data: { ...doc, divisionId: null } });
      console.log(`📄 Dokumen seeded: ${doc.title}`);
    }
  }

  console.log(`✅ Seeding selesai!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
