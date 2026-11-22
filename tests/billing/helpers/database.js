import { PrismaClient } from "../../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function getVerifiedTestTarget() {
  const connectionString = process.env.BILLING_TEST_DATABASE_URL;
  const expectedHost = process.env.BILLING_TEST_EXPECTED_HOST;
  const expectedDatabase = process.env.BILLING_TEST_EXPECTED_DATABASE;
  const confirmation = process.env.BILLING_TEST_CONFIRMATION;

  if (
    !connectionString ||
    !expectedHost ||
    !expectedDatabase ||
    confirmation !== "BILLING_QA_ONLY"
  ) {
    throw new Error(
      "Refusing billing QA database access: set BILLING_TEST_DATABASE_URL, BILLING_TEST_EXPECTED_HOST, BILLING_TEST_EXPECTED_DATABASE, and BILLING_TEST_CONFIRMATION=BILLING_QA_ONLY.",
    );
  }

  const target = new URL(connectionString);
  const database = target.pathname.replace(/^\//, "").split("?")[0];
  if (target.hostname !== expectedHost || database !== expectedDatabase) {
    throw new Error(
      `Refusing database target ${target.hostname}/${database}; it does not match the explicitly approved test target.`,
    );
  }

  return {
    connectionString,
    host: target.hostname,
    database,
  };
}

export async function connectToTestDatabase() {
  const target = getVerifiedTestTarget();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: target.connectionString }),
  });
  const [databaseInfo] = await prisma.$queryRaw`
    SELECT current_database() AS database,
           current_setting('server_version') AS server_version
  `;

  if (databaseInfo.database !== target.database) {
    await prisma.$disconnect();
    throw new Error(
      `Connected database ${databaseInfo.database} did not match approved database ${target.database}.`,
    );
  }

  console.log(
    `Billing QA database: ${target.host}/${target.database}`,
  );
  return prisma;
}
