import { prisma } from "@/lib/prisma";

export function getPrimarySchool() {
  return prisma.school.findFirst({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
