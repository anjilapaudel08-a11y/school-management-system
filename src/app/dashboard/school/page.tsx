import { prisma } from "@/lib/prisma";
import SchoolForm from "@/components/SchoolForm";

export default async function SchoolPage() {
  const school = await prisma.school.findFirst();

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-(--foreground)">
          School
        </h1>

        <p className="mt-1 text-(--muted)">
          Manage the school's basic information.
        </p>
      </div>

      <section className="rounded-xl border border-(--border) bg-(--surface) p-6">
        <SchoolForm />
      </section>
    </div>
  );
}