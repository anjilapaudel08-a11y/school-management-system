export function canManageStudentCredits(
  role: string | null | undefined,
): boolean {
  return role === "ADMIN";
}
