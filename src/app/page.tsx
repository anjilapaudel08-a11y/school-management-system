import { prisma } from "@/lib/prisma";

export default async function Home() {
  const schoolCount = await prisma.school.count();

  return (
    <main>
      <h1>School Management System</h1>
      <p>Schools in database: {schoolCount}</p>
    </main>
  );
}