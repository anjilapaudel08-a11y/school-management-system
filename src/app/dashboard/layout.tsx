import type { ReactNode } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const school = await prisma.school.findFirst({
    select: { name: true, shortName: true },
  });

  return (
    <DashboardShell
      userEmail={session.user?.email ?? ""}
      userName={session.user?.name ?? ""}
      userRole={String(session.user?.role ?? "ADMIN")}
      schoolName={school?.shortName || school?.name || "School Management"}
    >
      {children}
    </DashboardShell>
  );
}
