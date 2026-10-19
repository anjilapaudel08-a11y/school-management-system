"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  Calendar,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  User,
  Wallet,
} from "lucide-react";

type BillItem = {
  id: string;
  feeType: string;
  description: string;
  quantity: string | number;
  rate: string | number;
  amount: string | number;
  discountAmount: string | number;
  discountPercent: string | number;
  netAmount: string | number;
  studentChargeId: string | null;
};

type Payment = {
  id: string;
  amount: string | number;
  paymentDate: string;
  method: string;
  reference: string | null;
  notes: string | null;
  waiverAmount: string | number;
  waiverReason: string | null;
};

type CreditApplication = {
  id: string;
  amount: string | number;
  credit?: {
    id: string;
    amount: string | number;
  } | null;
};

type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
};

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type Bill = {
  id: string;
  studentId: string;
  academicYearId: string;
  billNumber: string;
  billingDate: string;
  dueDate: string;
  totalAmount: string | number;
  discountAmount: string | number;
  paidAmount: string | number;
  status: string;
  notes: string | null;
  periodStart: string;
  periodEnd: string;
  student: Student;
  academicYear: AcademicYear;
  items: BillItem[];
  payments: Payment[];
  creditApplications: CreditApplication[];
};

const paymentMethods = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "ONLINE", label: "Online" },
  { value: "OTHER", label: "Other" },
];

function toNumber(value: string | number | null | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: string | number | null | undefined) {
  return `Rs. ${toNumber(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStudentName(student: Student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

export default function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [billId, setBillId] = useState("");

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [waiverAmount, setWaiverAmount] = useState("");
  const [waiverReason, setWaiverReason] = useState("");

  useEffect(() => {
    params.then(({ id }) => {
      setBillId(id);
    });
  }, [params]);

  useEffect(() => {
    if (!billId) return;

    fetchBill(billId);
  }, [billId]);

  async function fetchBill(id: string) {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/bills?id=${id}`, {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load bill.");
      }

      const bills: Bill[] = Array.isArray(data) ? data : [];

      const foundBill = bills.find((item) => item.id === id);

      if (!foundBill) {
        throw new Error("Bill not found.");
      }

      setBill(foundBill);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Failed to load bill."
      );
    } finally {
      setLoading(false);
    }
  }

  const paymentTotals = useMemo(() => {
    if (!bill) {
      return {
        paid: 0,
        waiver: 0,
        credit: 0,
        settled: 0,
        remaining: 0,
      };
    }

    const paid = bill.payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0
    );

    const waiver = bill.payments.reduce(
      (sum, payment) => sum + toNumber(payment.waiverAmount),
      0
    );

    const credit = bill.creditApplications.reduce(
      (sum, application) => sum + toNumber(application.amount),
      0
    );

    const settled = paid + waiver + credit;

    const remaining = Math.max(
      0,
      toNumber(bill.totalAmount) - settled
    );

    return {
      paid,
      waiver,
      credit,
      settled,
      remaining,
    };
  }, [bill]);

  const enteredAmount = toNumber(amount);
  const enteredWaiver = toNumber(waiverAmount);

  const formSettlement = enteredAmount + enteredWaiver;

  const remainingAfterForm = Math.max(
    0,
    paymentTotals.remaining - formSettlement
  );

  function openPaymentForm() {
    setPaymentError("");
    setPaymentSuccess("");

    setAmount(
      paymentTotals.remaining > 0
        ? paymentTotals.remaining.toFixed(2)
        : ""
    );

    setPaymentDate(new Date().toISOString().split("T")[0]);
    setMethod("CASH");
    setReference("");
    setNotes("");
    setWaiverAmount("");
    setWaiverReason("");

    setShowPaymentForm(true);
  }

  function closePaymentForm() {
    if (savingPayment) return;

    setShowPaymentForm(false);
    setPaymentError("");
  }

  async function handleRecordPayment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!bill) return;

    setPaymentError("");
    setPaymentSuccess("");

    const paymentAmount = Number(amount);
    const paymentWaiver = Number(waiverAmount || 0);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setPaymentError(
        "Payment amount must be greater than 0."
      );
      return;
    }

    if (
      !Number.isFinite(paymentWaiver) ||
      paymentWaiver < 0
    ) {
      setPaymentError(
        "Waiver amount cannot be negative."
      );
      return;
    }

    if (
      paymentAmount + paymentWaiver >
      paymentTotals.remaining
    ) {
      setPaymentError(
        `Payment plus waiver cannot exceed the outstanding balance of ${formatCurrency(
          paymentTotals.remaining
        )}.`
      );
      return;
    }

    if (
      paymentWaiver > 0 &&
      !waiverReason.trim()
    ) {
      setPaymentError(
        "Waiver reason is required when a waiver is given."
      );
      return;
    }

    try {
      setSavingPayment(true);

      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billId: bill.id,
          amount: paymentAmount,
          method,
          reference: reference.trim() || undefined,
          notes: notes.trim() || undefined,
          waiverAmount: paymentWaiver,
          waiverReason:
            paymentWaiver > 0
              ? waiverReason.trim()
              : undefined,
          paymentDate: paymentDate || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to record payment."
        );
      }

      setPaymentSuccess(
        "Payment recorded successfully."
      );

      setShowPaymentForm(false);

      await fetchBill(bill.id);
    } catch (err) {
      console.error(err);

      setPaymentError(
        err instanceof Error
          ? err.message
          : "Failed to record payment."
      );
    } finally {
      setSavingPayment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading bill...
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/finance/bills"
          className="inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bills
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Bill not found."}
        </div>
      </div>
    );
  }

  const studentName = getStudentName(bill.student);

  const billTotal = toNumber(bill.totalAmount);

  const statusClass =
    bill.status === "PAID"
      ? "bg-green-100 text-green-700"
      : bill.status === "PARTIAL"
      ? "bg-yellow-100 text-yellow-700"
      : bill.status === "CANCELLED"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-700";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link
            href="/dashboard/finance/bills"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bills
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {bill.billNumber}
            </h1>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
            >
              {bill.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {studentName} • {bill.student.admissionNumber}
          </p>
        </div>

        {bill.status !== "PAID" &&
          bill.status !== "CANCELLED" &&
          paymentTotals.remaining > 0 && (
            <button
              type="button"
              onClick={openPaymentForm}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800"
            >
              <Banknote className="h-4 w-4" />
              Record Payment
            </button>
          )}
      </div>

      {/* Success message */}
      {paymentSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {paymentSuccess}
        </div>
      )}

      {/* Payment form */}
      {showPaymentForm && (
        <div className="rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-red-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Record Payment
                </h2>
                <p className="text-sm text-gray-500">
                  Outstanding balance:{" "}
                  <span className="font-semibold text-red-700">
                    {formatCurrency(paymentTotals.remaining)}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={closePaymentForm}
                disabled={savingPayment}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </div>

          <form
            onSubmit={handleRecordPayment}
            className="space-y-6 p-6"
          >
            {paymentError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {paymentError}
              </div>
            )}

            {/* Settlement preview */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Outstanding
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatCurrency(paymentTotals.remaining)}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  This Settlement
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatCurrency(formSettlement)}
                </p>
              </div>

              <div
                className={`rounded-lg border p-4 ${
                  formSettlement > paymentTotals.remaining
                    ? "border-red-200 bg-red-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Remaining After
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatCurrency(remainingAfterForm)}
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Amount */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Amount <span className="text-red-600">*</span>
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Waiver */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Waiver Amount
                </label>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={waiverAmount}
                    onChange={(e) =>
                      setWaiverAmount(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-11 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Payment date */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Date
                </label>

                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) =>
                      setPaymentDate(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Payment Method{" "}
                  <span className="text-red-600">*</span>
                </label>

                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                    required
                  >
                    {paymentMethods.map((paymentMethod) => (
                      <option
                        key={paymentMethod.value}
                        value={paymentMethod.value}
                      >
                        {paymentMethod.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Reference Number
                </label>

                <input
                  type="text"
                  value={reference}
                  onChange={(e) =>
                    setReference(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  placeholder="Transaction / cheque number"
                />
              </div>

              {/* Waiver reason */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Waiver Reason
                  {enteredWaiver > 0 && (
                    <span className="text-red-600"> *</span>
                  )}
                </label>

                <input
                  type="text"
                  value={waiverReason}
                  onChange={(e) =>
                    setWaiverReason(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                  placeholder="Required if waiver is given"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notes
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                placeholder="Optional payment notes"
              />
            </div>

            {/* Warning */}
            {formSettlement > paymentTotals.remaining && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Payment amount plus waiver cannot exceed the
                outstanding balance.
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closePaymentForm}
                disabled={savingPayment}
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  savingPayment ||
                  paymentAmountIsInvalid(
                    enteredAmount,
                    enteredWaiver,
                    paymentTotals.remaining
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Record Payment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student + Bill information */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
            <div className="rounded-lg bg-red-50 p-2 text-red-700">
              <User className="h-5 w-5" />
            </div>

            <h2 className="font-semibold text-gray-900">
              Student Information
            </h2>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Name
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {studentName}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Admission Number
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {bill.student.admissionNumber}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Phone
              </p>
              <p className="mt-1 text-gray-700">
                {bill.student.phone || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Gender
              </p>
              <p className="mt-1 text-gray-700">
                {bill.student.gender || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
            <div className="rounded-lg bg-red-50 p-2 text-red-700">
              <FileText className="h-5 w-5" />
            </div>

            <h2 className="font-semibold text-gray-900">
              Bill Information
            </h2>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Academic Year
              </p>
              <p className="mt-1 font-medium text-gray-900">
                {bill.academicYear.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Billing Date
              </p>
              <p className="mt-1 text-gray-700">
                {formatDate(bill.billingDate)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Period
              </p>
              <p className="mt-1 text-gray-700">
                {formatDate(bill.periodStart)} -{" "}
                {formatDate(bill.periodEnd)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Due Date
              </p>
              <p className="mt-1 text-gray-700">
                {formatDate(bill.dueDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-semibold text-gray-900">
            Fee Breakdown
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-6 py-3">Fee</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Rate</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Discount</th>
                <th className="px-6 py-3 text-right">
                  Net Amount
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {bill.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.feeType}
                    </p>
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {toNumber(item.quantity)}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatCurrency(item.rate)}
                  </td>

                  <td className="px-6 py-4 text-gray-700">
                    {formatCurrency(item.amount)}
                  </td>

                  <td className="px-6 py-4">
                    {toNumber(item.discountAmount) > 0 ? (
                      <div>
                        <p className="font-medium text-red-600">
                          -{formatCurrency(item.discountAmount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {toNumber(
                            item.discountPercent
                          )}
                          %
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-500">
                        -
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    {formatCurrency(item.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>

            <tfoot className="border-t border-gray-200 bg-gray-50">
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-right font-semibold text-gray-700"
                >
                  Bill Total
                </td>
                <td className="px-6 py-4 text-right text-lg font-bold text-gray-900">
                  {formatCurrency(billTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Settlement summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Bill Total"
          value={formatCurrency(billTotal)}
        />

        <SummaryCard
          label="Paid"
          value={formatCurrency(paymentTotals.paid)}
        />

        <SummaryCard
          label="Waiver"
          value={formatCurrency(paymentTotals.waiver)}
        />

        <SummaryCard
          label="Remaining"
          value={formatCurrency(paymentTotals.remaining)}
          highlight={paymentTotals.remaining > 0}
        />
      </div>

      {/* Payment history */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
          <div className="rounded-lg bg-red-50 p-2 text-red-700">
            <Banknote className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Payment History
            </h2>
            <p className="text-sm text-gray-500">
              {bill.payments.length} payment
              {bill.payments.length === 1 ? "" : "s"} recorded
            </p>
          </div>
        </div>

        {bill.payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No payments have been recorded for this bill.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Method</th>
                  <th className="px-6 py-3">Reference</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Waiver</th>
                  <th className="px-6 py-3">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {bill.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(payment.paymentDate)}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        {payment.method}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      {payment.reference || "-"}
                    </td>

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>

                    <td className="px-6 py-4">
                      {toNumber(payment.waiverAmount) > 0 ? (
                        <div>
                          <p className="font-semibold text-red-600">
                            {formatCurrency(
                              payment.waiverAmount
                            )}
                          </p>
                          <p className="max-w-[180px] text-xs text-gray-500">
                            {payment.waiverReason || "-"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-500">
                          -
                        </span>
                      )}
                    </td>

                    <td className="max-w-[250px] px-6 py-4 text-gray-700">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      {bill.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">
            Bill Notes
          </h2>

          <p className="text-sm leading-6 text-gray-600">
            {bill.notes}
          </p>
        </div>
      )}
    </div>
  );
}

function paymentAmountIsInvalid(
  amount: number,
  waiver: number,
  remaining: number
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return true;
  }

  if (!Number.isFinite(waiver) || waiver < 0) {
    return true;
  }

  return amount + waiver > remaining;
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        highlight
          ? "border-red-200"
          : "border-gray-200"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          highlight
            ? "text-red-700"
            : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}