"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatBSDate } from "@/lib/nepali-date";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CreditCard,
  Eye,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

type PaymentMethod =
  | "CASH"
  | "BANK"
  | "ONLINE"
  | "OTHER";

type Student = {
  id: string;
  name: string;
  admissionNumber?: string | null;
};

type AcademicYear = {
  id: string;
  name: string;
};

type Bill = {
  id: string;
  billNumber: string;
  student: Student;
  academicYear: AcademicYear;
};

type Payment = {
  id: string;
  billId: string;
  amount: string | number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  waiverAmount: string | number;
  waiverReason?: string | null;
  bill: Bill;
};

type PaymentsResponse = {
  payments: Payment[];
  count: number;
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  BANK: "Bank",
  ONLINE: "Online",
  OTHER: "Other",
};

function formatCurrency(value: number) {
  return `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string) {
  return formatBSDate(value);
}

function getMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "CASH":
      return <Banknote className="h-4 w-4" />;
    case "BANK":
      return <CreditCard className="h-4 w-4" />;
    case "ONLINE":
      return <Wallet className="h-4 w-4" />;
    default:
      return <Receipt className="h-4 w-4" />;
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] =
    useState<"ALL" | PaymentMethod>("ALL");

  async function loadPayments(showRefresh = false) {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch("/api/payments", {
        cache: "no-store",
      });

      const data: PaymentsResponse | { error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(
          "error" in data && data.error
            ? data.error
            : "Failed to load payments."
        );
      }

      setPayments(
        "payments" in data ? data.payments : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load payments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPayments();
  }, []);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesMethod =
        methodFilter === "ALL" ||
        payment.method === methodFilter;

      if (!matchesMethod) {
        return false;
      }

      if (!query) {
        return true;
      }

      const studentName =
        payment.bill?.student?.name ?? "";

      const admissionNumber =
        payment.bill?.student?.admissionNumber ?? "";

      const billNumber =
        payment.bill?.billNumber ?? "";

      const reference =
        payment.reference ?? "";

      return [
        studentName,
        admissionNumber,
        billNumber,
        reference,
        methodLabels[payment.method],
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [payments, search, methodFilter]);

  const summary = useMemo(() => {
    const totalCollected = payments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount),
      0
    );

    const totalWaivers = payments.reduce(
      (sum, payment) =>
        sum + Number(payment.waiverAmount || 0),
      0
    );

    const cashCollected = payments
      .filter((payment) => payment.method === "CASH")
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    const bankCollected = payments
      .filter((payment) => payment.method === "BANK")
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    const onlineCollected = payments
      .filter(
        (payment) => payment.method === "ONLINE"
      )
      .reduce(
        (sum, payment) =>
          sum + Number(payment.amount),
        0
      );

    return {
      totalCollected,
      totalWaivers,
      cashCollected,
      bankCollected,
      onlineCollected,
      count: payments.length,
    };
  }, [payments]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Link
              href="/dashboard/finance"
              className="inline-flex items-center gap-1 text-sm text-(--muted) hover:text-(--foreground)"
            >
              <ArrowLeft className="h-4 w-4" />
              Finance
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-(--foreground)">
            Payments
          </h1>

          <p className="mt-1 text-sm text-(--muted)">
            View and manage recorded student payments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadPayments(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-4 py-2.5 text-sm font-medium text-(--foreground) hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--muted)">
                Total Collected
              </p>

              <p className="mt-2 text-2xl font-bold text-(--foreground)">
                {formatCurrency(
                  summary.totalCollected
                )}
              </p>
            </div>

            <div className="rounded-lg bg-black/5 p-3">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--muted)">
                Total Waivers
              </p>

              <p className="mt-2 text-2xl font-bold text-(--foreground)">
                {formatCurrency(
                  summary.totalWaivers
                )}
              </p>
            </div>

            <div className="rounded-lg bg-black/5 p-3">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--muted)">
                Cash Collected
              </p>

              <p className="mt-2 text-2xl font-bold text-(--foreground)">
                {formatCurrency(
                  summary.cashCollected
                )}
              </p>
            </div>

            <div className="rounded-lg bg-black/5 p-3">
              <Banknote className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--muted)">
                Payments Recorded
              </p>

              <p className="mt-2 text-2xl font-bold text-(--foreground)">
                {summary.count}
              </p>
            </div>

            <div className="rounded-lg bg-black/5 p-3">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--muted)" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search student, bill, admission no..."
              className="w-full rounded-lg border border-(--border) bg-(--background) py-2.5 pl-10 pr-4 text-sm outline-none focus:border-(--primary)"
            />
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="method"
              className="text-sm text-(--muted)"
            >
              Method
            </label>

            <select
              id="method"
              value={methodFilter}
              onChange={(event) =>
                setMethodFilter(
                  event.target.value as
                    | "ALL"
                    | PaymentMethod
                )
              }
              className="rounded-lg border border-(--border) bg-(--background) px-3 py-2.5 text-sm outline-none focus:border-(--primary)"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="ONLINE">Online</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment table */}
      <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
        <div className="border-b border-(--border) px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-(--foreground)">
                Payment History
              </h2>

              <p className="mt-1 text-sm text-(--muted)">
                {loading
                  ? "Loading payments..."
                  : `${filteredPayments.length} payment${
                      filteredPayments.length === 1
                        ? ""
                        : "s"
                    } found`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-6 py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-(--muted)" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Receipt className="mx-auto h-10 w-10 text-(--muted)" />

            <h3 className="mt-4 font-medium text-(--foreground)">
              No payments found
            </h3>

            <p className="mt-1 text-sm text-(--muted)">
              {search || methodFilter !== "ALL"
                ? "Try changing your filters."
                : "No payments have been recorded yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="border-b border-(--border) bg-black/[0.02]">
                <tr className="text-left text-xs uppercase tracking-wide text-(--muted)">
                  <th className="px-5 py-3">
                    Date
                  </th>

                  <th className="px-5 py-3">
                    Bill
                  </th>

                  <th className="px-5 py-3">
                    Student
                  </th>

                  <th className="px-5 py-3">
                    Amount
                  </th>

                  <th className="px-5 py-3">
                    Method
                  </th>

                  <th className="px-5 py-3">
                    Waiver
                  </th>

                  <th className="px-5 py-3">
                    Reference
                  </th>

                  <th className="px-5 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-(--border)">
                {filteredPayments.map(
                  (payment) => {
                    const amount = Number(
                      payment.amount
                    );

                    const waiver = Number(
                      payment.waiverAmount || 0
                    );

                    return (
                      <tr
                        key={payment.id}
                        className="hover:bg-black/[0.02]"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-(--muted)" />

                            <span>
                              {formatDate(
                                payment.paymentDate
                              )}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/finance/bills/${payment.billId}`}
                            className="font-medium text-(--foreground) hover:underline"
                          >
                            {
                              payment.bill
                                ?.billNumber
                            }
                          </Link>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-medium text-(--foreground)">
                              {
                                payment.bill
                                  ?.student
                                  ?.name
                              }
                            </p>

                            {payment.bill
                              ?.student
                              ?.admissionNumber && (
                              <p className="mt-0.5 text-xs text-(--muted)">
                                {
                                  payment.bill
                                    .student
                                    .admissionNumber
                                }
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-semibold">
                          {formatCurrency(amount)}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium">
                            {getMethodIcon(
                              payment.method
                            )}

                            {
                              methodLabels[
                                payment.method
                              ]
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4">
                          {waiver > 0 ? (
                            <div>
                              <p className="font-medium">
                                {formatCurrency(
                                  waiver
                                )}
                              </p>

                              {payment.waiverReason && (
                                <p className="mt-0.5 max-w-[180px] truncate text-xs text-(--muted)">
                                  {
                                    payment.waiverReason
                                  }
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-(--muted)">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {payment.reference ? (
                            <span className="text-(--foreground)">
                              {
                                payment.reference
                              }
                            </span>
                          ) : (
                            <span className="text-(--muted)">
                              —
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/finance/bills/${payment.billId}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) px-3 py-2 text-xs font-medium hover:bg-black/5"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Bill
                          </Link>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}