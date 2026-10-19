
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
      {/* Sidebar */}
      <aside className="w-64 bg-(--primary-dark) p-6 text-white">
        <h1 className="text-xl font-bold">School Management</h1>
        <p className="mt-1 text-sm opacity-70">Administration</p>

        <nav className="mt-8 space-y-1">
          {/* Dashboard */}
          <a
            href="/dashboard"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Dashboard
          </a>

          {/* Students */}
          <a
            href="/dashboard/students"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Students
          </a>

          {/* Teachers */}
          <a
            href="/dashboard/teachers"
            className="block rounded-lg px-3 py-2 hover:bg-white/10"
          >
            Teachers
          </a>

          {/* Finance */}
          <div className="pt-3">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Finance
            </p>

            <div className="space-y-1">
              <a
                href="/dashboard/finance"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Finance Overview
              </a>

              <a
                href="/dashboard/finance/fees"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Fee Structures
              </a>

              <a
                href="/dashboard/finance/discounts"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Discounts
              </a>

              <a
                href="/dashboard/finance/student-charges"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Student Charges
              </a>

              <a
                href="/dashboard/finance/bills"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Bills
              </a>

              <a
                href="/dashboard/finance/bills/new"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Create New Bill
              </a>

              <a
                href="/dashboard/finance/payments"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Payments
              </a>
            </div>
          </div>

          {/* Academic */}
          <div className="pt-3">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              Academic
            </p>

            <div className="space-y-1">
              {/* Academic Years */}
              <a
                href="/dashboard/academic-years"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Academic Years
              </a>

              {/* Results */}
              <a
                href="/dashboard/results"
                className="block rounded-lg px-3 py-2 hover:bg-white/10"
              >
                Results
              </a>
            </div>
          </div>

          {/* School */}
          <div className="pt-3">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
              School
            </p>

            <a
              href="/dashboard/school"
              className="block rounded-lg px-3 py-2 hover:bg-white/10"
            >
              School Information
            </a>
          </div>
        </nav>

        {/* User section */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="mb-3 truncate text-sm opacity-70">
            {session.user?.email}
          </p>

          <p className="mb-4 text-xs uppercase opacity-50">
            {session.user?.role}
          </p>

          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
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

