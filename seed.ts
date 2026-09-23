import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const name = process.env.ADMIN_NAME || "Eric";
  if (!email) {
    throw new Error("Set ADMIN_EMAIL (and optionally ADMIN_NAME) before seeding.");
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: { isAdmin: true },
    create: { email, name, isAdmin: true, balance: 1000 },
  });

  console.log(`Admin ready: ${admin.name} <${admin.email}>`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
