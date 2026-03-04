import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";
  const password = "password123";
  const name = "Admin User";

  // Cek apakah user sudah ada
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
  }

  console.log(`✅ User admin@example.com is ready.`);

  // 2. Seed RAG Documents
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
      await prisma.document.create({ data: doc });
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
