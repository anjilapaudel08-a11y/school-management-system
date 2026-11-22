import { Prisma } from "@/generated/prisma/client";

export function isPrismaErrorCode(
  error: unknown,
  code: string,
): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}
