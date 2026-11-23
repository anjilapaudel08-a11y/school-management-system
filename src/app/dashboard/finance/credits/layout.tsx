import type { ReactNode } from "react";
import { auth } from "@/auth";
import { canManageStudentCredits } from "@/lib/finance/credit-access";
import { redirect } from "next/navigation";

export default async function StudentCreditsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }
  if (!canManageStudentCredits(session.user?.role)) {
    redirect("/dashboard");
  }

  return children;
}
