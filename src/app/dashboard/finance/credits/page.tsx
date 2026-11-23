"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BikramDatePicker } from "@inicrea/bikram-sambat-react";
import "@inicrea/bikram-sambat-react/styles.css";
import {
  adDateToBSInput,
  formatBSDate,
} from "@/lib/nepali-date";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
};

type Actor = {
  id: string;
  name: string;
  email: string;
};

type CreditApplication = {
  id: string;
  amount: string | number;
  createdAt: string;
  reversedAt: string | null;
  reversalReason: string | null;
  bill: {
    id: string;
    billNumber: string;
    totalAmount: string | number;
    status: string;
  };
  appliedBy: Actor | null;
  reversedBy: Actor | null;
};

type StudentCredit = {
  id: string;
  studentId: string;
  academicYearId: string;
  amount: string | number;
  availableAmount: string | number;
  source: string;
  notes: string | null;
  issueDate: string | null;
  reason: string | null;
  applicationEligible: boolean;
  student: Student;
  academicYear: AcademicYear;
  issuedBy: Actor | null;
  applications: CreditApplication[];
};

type EligibleBill = {
  id: string;
  billNumber: string;
  totalAmount: string | number;
  status: string;
  outstandingAmount: number;
};

type CreditDetail = StudentCredit & {
  eligibleBills: EligibleBill[];
};

type IssueForm = {
  studentId: string;
  academicYearId: string;
  amount: string;
  reason: string;
  issueDate: string;
  notes: string;
};

const money = (value: string | number) =>
  `Rs. ${Number(value).toLocaleString("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const studentName = (student: Student) =>
  [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ");

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export default function StudentCreditsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [issueForm, setIssueForm] = useState<IssueForm>({
    studentId: "",
    academicYearId: "",
    amount: "",
    reason: "",
    issueDate: "",
    notes: "",
  });
  const [issueKey, setIssueKey] = useState(newIdempotencyKey);
  const [selectedCreditId, setSelectedCreditId] = useState("");
  const [creditDetail, setCreditDetail] = useState<CreditDetail | null>(null);
  const [applicationForm, setApplicationForm] = useState({
    billId: "",
    amount: "",
  });
  const [applicationKey, setApplicationKey] = useState("");
  const [reversingId, setReversingId] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [creditResponse, studentResponse, yearResponse] =
        await Promise.all([
          fetch("/api/student-credits", { cache: "no-store" }),
          fetch("/api/students", { cache: "no-store" }),
          fetch("/api/academic-years", { cache: "no-store" }),
        ]);
      const [creditData, studentData, yearData] = await Promise.all([
        creditResponse.json(),
        studentResponse.json(),
        yearResponse.json(),
      ]);

      if (!creditResponse.ok) {
        throw new Error(creditData.error ?? "Could not load student credits.");
      }
      if (!studentResponse.ok) {
        throw new Error(studentData.error ?? "Could not load students.");
      }
      if (!yearResponse.ok) {
        throw new Error(yearData.error ?? "Could not load academic years.");
      }

      const availableYears: AcademicYear[] = Array.isArray(yearData)
        ? yearData
        : [];
      setCredits(Array.isArray(creditData) ? creditData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
      setYears(availableYears);
      setIssueForm((current) => ({
        ...current,
        issueDate:
          current.issueDate || adDateToBSInput(new Date()),
        academicYearId:
          current.academicYearId ||
          availableYears.find((year) => year.isActive)?.id ||
          availableYears[0]?.id ||
          "",
      }));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load student credits.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function initialize() {
      await loadData();
    }

    void initialize();
  }, []);

  const applicationHistory = useMemo(
    () =>
      credits.flatMap((credit) =>
        credit.applications.map((application) => ({
          ...application,
          credit,
        })),
      ),
    [credits],
  );

  function updateIssueForm<K extends keyof IssueForm>(
    key: K,
    value: IssueForm[K],
  ) {
    setIssueForm((current) => ({ ...current, [key]: value }));
    setIssueKey(newIdempotencyKey());
  }

  async function handleIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const response = await fetch("/api/student-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": issueKey,
        },
        body: JSON.stringify(issueForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not issue credit.");
      }

      setNotice("Approved student credit recorded.");
      setIssueForm((current) => ({
        ...current,
        amount: "",
        reason: "",
        notes: "",
        issueDate: adDateToBSInput(new Date()),
      }));
      setIssueKey(newIdempotencyKey());
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not issue credit.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function selectCredit(creditId: string) {
    setSelectedCreditId(creditId);
    setCreditDetail(null);
    setApplicationForm({ billId: "", amount: "" });
    setApplicationKey("");
    setError("");

    if (!creditId) {
      return;
    }

    try {
      const response = await fetch(
        `/api/student-credits/${encodeURIComponent(creditId)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not load eligible bills.");
      }
      setCreditDetail(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load eligible bills.",
      );
    }
  }

  async function handleApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCreditId) {
      return;
    }

    setError("");
    setNotice("");
    setSaving(true);

    try {
      const requestKey = applicationKey || newIdempotencyKey();
      setApplicationKey(requestKey);
      const response = await fetch(
        `/api/student-credits/${encodeURIComponent(selectedCreditId)}/applications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": requestKey,
          },
          body: JSON.stringify(applicationForm),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not apply credit.");
      }

      setNotice("Credit applied to the selected bill.");
      setApplicationForm({ billId: "", amount: "" });
      setApplicationKey("");
      await loadData();
      await selectCredit(selectedCreditId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not apply credit.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReversal(
    event: FormEvent<HTMLFormElement>,
    applicationId: string,
  ) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const response = await fetch(
        `/api/student-credit-applications/${encodeURIComponent(applicationId)}/reverse`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reversalReason }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Could not reverse application.");
      }

      setNotice("Credit application reversed and its balance restored.");
      setReversingId("");
      setReversalReason("");
      await loadData();
      if (selectedCreditId) {
        await selectCredit(selectedCreditId);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reverse application.",
      );
    } finally {
      setSaving(false);
    }
  }

  const selectedBill = creditDetail?.eligibleBills.find(
    (bill) => bill.id === applicationForm.billId,
  );
  const maximumApplication = selectedBill
    ? Math.min(
        Number(creditDetail?.availableAmount ?? 0),
        selectedBill.outstandingAmount,
      )
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Student Credits</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-600">
          Record credits only after an authorized school adjustment. Credits
          are not created from payments, waivers, discounts, or bill
          cancellations.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {notice}
        </div>
      )}

      <form
        onSubmit={handleIssue}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Issue an approved credit
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            The issue date must be within the selected academic year. Issued
            credits are audit records and cannot be edited or deleted.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-medium text-gray-700">
            Student *
            <select
              required
              value={issueForm.studentId}
              onChange={(event) =>
                updateIssueForm("studentId", event.target.value)
              }
              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.admissionNumber} · {studentName(student)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Academic year *
            <select
              required
              value={issueForm.academicYearId}
              onChange={(event) =>
                updateIssueForm("academicYearId", event.target.value)
              }
              className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
            >
              <option value="">Select academic year</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                  {year.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">
            Credit issue date (BS) *
            <BikramDatePicker
              value={issueForm.issueDate}
              onChange={(value) => updateIssueForm("issueDate", value)}
              valueFormat="BS"
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Amount (Rs.) *
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={issueForm.amount}
              onChange={(event) =>
                updateIssueForm("amount", event.target.value)
              }
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Reason *
            <input
              required
              maxLength={300}
              value={issueForm.reason}
              onChange={(event) =>
                updateIssueForm("reason", event.target.value)
              }
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5"
              placeholder="Approved fee correction, duplicate collection..."
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Approval reference / notes *
            <input
              required
              maxLength={500}
              value={issueForm.notes}
              onChange={(event) =>
                updateIssueForm("notes", event.target.value)
              }
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || loading || years.length === 0 || students.length === 0}
          className="rounded-lg bg-[#81392e] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6e3027] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Record approved credit"}
        </button>
      </form>

      {selectedCreditId && (
        <form
          onSubmit={handleApplication}
          className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Apply credit to a bill
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Available credit:{" "}
                {money(creditDetail?.availableAmount ?? 0)}
                {creditDetail
                  ? ` · ${creditDetail.academicYear.name} only`
                  : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void selectCredit("")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
          </div>

          {creditDetail && !creditDetail.applicationEligible && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This credit has incomplete audit details, no available balance,
              or needs balance reconciliation, so it cannot be applied.
            </p>
          )}
          {creditDetail?.applicationEligible &&
            creditDetail.eligibleBills.length === 0 && (
              <p className="text-sm text-gray-600">
                This student has no outstanding bills in this academic year.
              </p>
            )}

          {creditDetail?.applicationEligible &&
            creditDetail.eligibleBills.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-gray-700">
                  Eligible bill *
                  <select
                    required
                    value={applicationForm.billId}
                    onChange={(event) => {
                      setApplicationForm({
                        billId: event.target.value,
                        amount: "",
                      });
                      setApplicationKey(newIdempotencyKey());
                    }}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                  >
                    <option value="">Select bill</option>
                    {creditDetail.eligibleBills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.billNumber} · due {money(bill.outstandingAmount)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Amount to apply (Rs.) *
                  <input
                    required
                    type="number"
                    min="0.01"
                    max={maximumApplication.toFixed(2)}
                    step="0.01"
                    value={applicationForm.amount}
                    onChange={(event) => {
                      setApplicationForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }));
                      setApplicationKey(newIdempotencyKey());
                    }}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5"
                  />
                  {selectedBill && (
                    <span className="mt-1 block text-xs text-gray-500">
                      Maximum for this application:{" "}
                      {money(maximumApplication)}
                    </span>
                  )}
                </label>
              </div>
            )}

          <button
            type="submit"
            disabled={
              saving ||
              !creditDetail?.applicationEligible ||
              !selectedBill
            }
            className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? "Applying..." : "Apply selected amount"}
          </button>
        </form>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Credit ledger</h2>
          <p className="mt-1 text-sm text-gray-500">
            {credits.length} recorded credit{credits.length === 1 ? "" : "s"}
          </p>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-gray-500">Loading credit ledger...</p>
        ) : credits.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            No student credits have been recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Issue date</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Academic year</th>
                  <th className="px-5 py-3">Reason / reference</th>
                  <th className="px-5 py-3 text-right">Issued</th>
                  <th className="px-5 py-3 text-right">Available</th>
                  <th className="px-5 py-3">Issued by</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {credits.map((credit) => (
                  <tr key={credit.id}>
                    <td className="whitespace-nowrap px-5 py-3">
                      {credit.issueDate
                        ? formatBSDate(credit.issueDate)
                        : "Legacy / unrecorded"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">
                        {studentName(credit.student)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {credit.student.admissionNumber}
                      </div>
                    </td>
                    <td className="px-5 py-3">{credit.academicYear.name}</td>
                    <td className="max-w-[260px] px-5 py-3">
                      <div className="font-medium text-gray-900">
                        {credit.reason ?? "Audit details incomplete"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {credit.notes ?? "No reference recorded"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {money(credit.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                      {money(credit.availableAmount)}
                    </td>
                    <td className="px-5 py-3">
                      {credit.issuedBy?.name ?? "Not recorded"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <button
                        type="button"
                        disabled={!credit.applicationEligible}
                        onClick={() => void selectCredit(credit.id)}
                        className="font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Application and reversal history
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Entries are retained when reversed; the original bill and payment
            records are not rewritten.
          </p>
        </div>
        {applicationHistory.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            No credit applications have been recorded.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Applied date</th>
                  <th className="px-5 py-3">Student / credit</th>
                  <th className="px-5 py-3">Bill</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3">Accountant</th>
                  <th className="px-5 py-3">Status / reversal</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applicationHistory.map((application) => (
                  <tr key={application.id}>
                    <td className="whitespace-nowrap px-5 py-3">
                      {formatBSDate(application.createdAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">
                        {studentName(application.credit.student)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {application.credit.academicYear.name}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {application.bill.billNumber}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                      {money(application.amount)}
                    </td>
                    <td className="px-5 py-3">
                      {application.appliedBy?.name ?? "Not recorded"}
                    </td>
                    <td className="px-5 py-3">
                      {application.reversedAt ? (
                        <>
                          <div className="font-medium text-red-700">
                            Reversed {formatBSDate(application.reversedAt)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {application.reversalReason} ·{" "}
                            {application.reversedBy?.name ?? "Unknown"}
                          </div>
                        </>
                      ) : (
                        <span className="font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {application.reversedAt ? null : reversingId ===
                        application.id ? (
                        <form
                          onSubmit={(event) =>
                            void handleReversal(event, application.id)
                          }
                          className="flex min-w-[280px] items-center gap-2"
                        >
                          <input
                            required
                            maxLength={300}
                            value={reversalReason}
                            onChange={(event) =>
                              setReversalReason(event.target.value)
                            }
                            placeholder="Reversal reason"
                            className="min-w-0 rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={saving}
                            className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setReversingId("");
                              setReversalReason("");
                            }}
                            className="text-xs text-gray-600 hover:underline"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setReversingId(application.id);
                            setReversalReason("");
                          }}
                          className="font-medium text-red-700 hover:underline"
                        >
                          Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
