"use client";

import Link from "next/link";

const financeModules = [
  {
    title: "Fee Structure",
    description:
      "Configure tuition, admission, bus, lab, exam, and miscellaneous fees for each class.",
    href: "/dashboard/finance/fees",
  },
  {
    title: "Student Billing",
    description:
      "Generate student bills, manage outstanding amounts, discounts, and billing periods.",
    href: "/dashboard/finance/billing",
  },
  {
    title: "Payments",
    description:
      "Record payments received from students and track paid, partial, and outstanding bills.",
    href: "/dashboard/finance/payments",
  },
  {
    title: "Expenses",
    description:
      "Record and manage school expenses such as supplies, utilities, maintenance, and medical expenses.",
    href: "/dashboard/finance/expenses",
  },
  {
    title: "Teacher Salaries",
    description:
      "Manage monthly teacher salaries, deductions, payments, and salary records.",
    href: "/dashboard/finance/salaries",
  },
];

export default function FinancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing & Finance</h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage school fees, student payments, expenses, and teacher
          salaries.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {financeModules.map((module) => (
          <Link
            key={module.href}
            href={module.href}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold group-hover:text-blue-600">
              {module.title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              {module.description}
            </p>

            <p className="mt-5 text-sm font-medium text-blue-600">
              Open →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}