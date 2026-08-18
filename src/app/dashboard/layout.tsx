import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-(--background)">
      <aside className="w-64 bg-(--primary-dark) p-6 text-white">
        <h1 className="text-xl font-bold">
          School Management
        </h1>

        <p className="mt-1 text-sm opacity-70">
          Administration
        </p>

        <nav className="mt-8 space-y-2">
          <a
            href="/dashboard"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Dashboard
          </a>

          <a
            href="/dashboard/students"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Students
          </a>

          <a
            href="/dashboard/teachers"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Teachers
          </a>

          <a
            href="/dashboard/finance"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Billing & Finance
          </a>

          <a
            href="/dashboard/results"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Results
          </a>

          <a
            href="/dashboard/school"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            School
          </a>
        </nav>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="mb-3 text-sm opacity-70">
            {session.user.email}
          </p>

          <p className="mb-4 text-xs uppercase opacity-50">
            {session.user.role}
          </p>

          <LogoutButton />
        </div>
      </aside>

      <div className="flex-1">
        <header className="border-b border-(--border) bg-(--surface) px-8 py-4">
          <p className="text-sm text-(--muted)">
            School Management System
          </p>
        </header>

        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}