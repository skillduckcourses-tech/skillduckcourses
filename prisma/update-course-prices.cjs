/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.course.updateMany({ data: { price: 999 } });
  console.log(`Updated ${result.count} course prices to PKR 999.`);
}

main()
  .catch((error) => {
    console.error("Unable to update course prices", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
