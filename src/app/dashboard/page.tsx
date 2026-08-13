import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";



export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const school = await prisma.school.findFirst({
    include: {
      academicYears: {
        where: {
          isActive: true,
        },
        take: 1,
      },
    },
  });

  if (!school) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-(--foreground)">
          Dashboard
        </h1>

        <p className="mt-2 text-(--muted)">
          No school has been configured yet.
        </p>
      </div>
    );
  }

  const [studentCount, teacherCount, classCount] =
    await Promise.all([
      prisma.student.count({
        where: {
          schoolId: school.id,
        },
      }),

      prisma.teacher.count({
        where: {
          schoolId: school.id,
        },
      }),

      prisma.class.count({
        where: {
          schoolId: school.id,
        },
      }),
    ]);

  const activeAcademicYear = school.academicYears[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(--foreground)">
          Dashboard
        </h1>

        <p className="mt-1 text-(--muted)">
          Welcome back, {session.user.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Students"
          value={studentCount}
        />

        <DashboardCard
          title="Teachers"
          value={teacherCount}
        />

        <DashboardCard
          title="Classes"
          value={classCount}
        />

        <DashboardCard
          title="Academic Year"
          value={activeAcademicYear?.name ?? "Not set"}
        />
      </div>

      <section className="rounded-xl border border-(--border) bg-(--surface) p-6">
        <h2 className="text-lg font-semibold text-(--foreground)">
          School
        </h2>

        <p className="mt-2 text-(--muted)">
          {school.name}
        </p>

        {school.address && (
          <p className="mt-1 text-sm text-(--muted)">
            {school.address}
          </p>
        )}
      </section>
    </div>
  );
}

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
      <p className="text-sm font-medium text-(--muted)">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-(--primary)">
        {value}
      </p>
    </div>
  );
}