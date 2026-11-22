"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { BikramDatePicker } from "@inicrea/bikram-sambat-react";
import "@inicrea/bikram-sambat-react/styles.css";
import { adDateToBSInput, bsInputToADDate } from "@/lib/nepali-date";

type AcademicYear = { id: string; name: string; isActive: boolean };
type Enrollment = { academicYearId: string; class: { name: string } };
type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
  enrollments: Enrollment[];
};
type EntryValues = {
  selected: boolean;
  percentage: string;
  quantity: string;
  rate: string;
};
type Failure = { studentId: string; error: string };

const discountFeeTypes = [
  ["TUITION", "Tuition"],
  ["ADMISSION", "Admission"],
  ["COMPUTER_LAB", "Computer lab"],
  ["EXAM", "Exam"],
];
const chargeFeeTypes = [
  ["BUS", "Bus"],
  ["MISCELLANEOUS", "Miscellaneous"],
];
const frequencies = [
  ["MONTHLY", "Monthly"],
  ["TERM", "Termly"],
  ["ANNUAL", "Annual"],
  ["ONE_TIME", "One time"],
];

function studentName(student: Student) {
  return [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");
}

function createEntryValues(): EntryValues {
  return { selected: false, percentage: "", quantity: "1", rate: "" };
}

export default function BulkAdjustmentsPage() {
  const [kind, setKind] = useState<"discount" | "charge">("discount");
  const [mode, setMode] = useState<"shared" | "sheet">("shared");
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rowValues, setRowValues] = useState<Record<string, EntryValues>>({});
  const [name, setName] = useState("");
  const [feeTypes, setFeeTypes] = useState<string[]>(["TUITION"]);
  const [percentage, setPercentage] = useState("");
  const [description, setDescription] = useState("");
  const [chargeFeeType, setChargeFeeType] = useState("BUS");
  const [frequency, setFrequency] = useState("MONTHLY");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState(() => adDateToBSInput(new Date()));
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    createdCount: number;
    failedCount: number;
    failures: Failure[];
  } | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [yearResponse, studentResponse] = await Promise.all([
          fetch("/api/academic-years", { cache: "no-store" }),
          fetch("/api/students", { cache: "no-store" }),
        ]);
        const [yearData, studentData] = await Promise.all([
          yearResponse.json(),
          studentResponse.json(),
        ]);
        if (!yearResponse.ok) throw new Error(yearData.error ?? "Could not load academic years.");
        if (!studentResponse.ok) throw new Error(studentData.error ?? "Could not load students.");
        const years: AcademicYear[] = Array.isArray(yearData) ? yearData : [];
        const studentList: Student[] = Array.isArray(studentData) ? studentData : [];
        setAcademicYears(years);
        setStudents(studentList);
        setAcademicYearId(
          years.find((year) => year.isActive)?.id ?? years[0]?.id ?? "",
        );
        setRowValues(
          Object.fromEntries(studentList.map((student) => [student.id, createEntryValues()])),
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load data.");
      } finally {
        setLoading(false);
      }
    }
    void loadOptions();
  }, []);

  const enrolledStudents = useMemo(
    () =>
      students.filter((student) =>
        student.enrollments?.some(
          (enrollment) => enrollment.academicYearId === academicYearId,
        ),
      ),
    [students, academicYearId],
  );
  const visibleStudents = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return enrolledStudents;
    return enrolledStudents.filter((student) =>
      [
        studentName(student),
        student.admissionNumber,
        student.enrollments.find((item) => item.academicYearId === academicYearId)?.class.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [enrolledStudents, query, academicYearId]);

  function updateRow(studentId: string, patch: Partial<EntryValues>) {
    setRowValues((current) => ({
      ...current,
      [studentId]: { ...(current[studentId] ?? createEntryValues()), ...patch },
    }));
  }

  function toggleFeeType(value: string) {
    setFeeTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function toggleVisible(checked: boolean) {
    if (mode === "shared") {
      const visibleIds = visibleStudents.map((student) => student.id);
      setSelectedIds((current) =>
        checked
          ? [...new Set([...current, ...visibleIds])]
          : current.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setRowValues((current) => {
        const updated = { ...current };
        for (const student of visibleStudents) {
          updated[student.id] = {
            ...(updated[student.id] ?? createEntryValues()),
            selected: checked,
          };
        }
        return updated;
      });
    }
  }

  const selectedCount =
    mode === "shared"
      ? selectedIds.length
      : Object.values(rowValues).filter((row) => row.selected).length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!academicYearId) {
      setError("Select an academic year.");
      return;
    }
    if (kind === "discount") {
      if (!name.trim()) return setError("Enter a discount name.");
      if (!feeTypes.length) return setError("Choose at least one fee type.");
      if (mode === "shared" && (!Number(percentage) || Number(percentage) <= 0 || Number(percentage) > 100)) {
        return setError("Enter a shared discount percentage greater than 0 and no more than 100.");
      }
    } else {
      if (!description.trim()) return setError("Enter a charge description.");
      if (mode === "shared" && (!Number.isFinite(Number(rate)) || Number(rate) < 0)) {
        return setError("Enter a valid shared charge rate.");
      }
      if (mode === "shared" && (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0)) {
        return setError("Enter a valid shared charge quantity.");
      }
    }
    if (!startDate) return setError("Choose a start date.");
    if (endDate && endDate < startDate) return setError("End date cannot be before start date.");

    const entries = mode === "shared"
      ? selectedIds.map((studentId) => ({
          studentId,
          ...(kind === "discount"
            ? { name: name.trim(), percentage: Number(percentage), feeTypes }
            : {
                description: description.trim(),
                feeType: chargeFeeType,
                frequency,
                quantity: Number(quantity),
                rate: Number(rate),
              }),
        }))
      : enrolledStudents
          .filter((student) => rowValues[student.id]?.selected)
          .map((student) => ({
            studentId: student.id,
            ...(kind === "discount"
              ? {
                  name: name.trim(),
                  percentage: Number(rowValues[student.id]?.percentage),
                  feeTypes,
                }
              : {
                  description: description.trim(),
                  feeType: chargeFeeType,
                  frequency,
                  quantity: Number(rowValues[student.id]?.quantity),
                  rate: Number(rowValues[student.id]?.rate),
                }),
          }));

    if (entries.length === 0) return setError("Select at least one student.");

    let startDateAD: string;
    let endDateAD: string | null;
    try {
      startDateAD = bsInputToADDate(startDate);
      endDateAD = endDate ? bsInputToADDate(endDate) : null;
    } catch (cause) {
      return setError(cause instanceof Error ? cause.message : "Select valid BS dates.");
    }

    setSaving(true);
    try {
      const response = await fetch("/api/student-adjustments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          academicYearId,
          entries: entries.map((entry) => ({
            ...entry,
            startDate: startDateAD,
            endDate: endDateAD,
            notes: notes.trim() || null,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save bulk adjustments.");
      setResult(data);
      setSelectedIds([]);
      setRowValues((current) =>
        Object.fromEntries(
          Object.entries(current).map(([id, value]) => [id, { ...value, selected: false }]),
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save bulk adjustments.");
    } finally {
      setSaving(false);
    }
  }

  const sharedFieldsValid =
    kind === "discount"
      ? Boolean(name.trim() && feeTypes.length)
      : Boolean(description.trim());

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9b6b5b]">Finance tools</p>
          <h1 className="mt-1 text-2xl font-bold text-[#302925]">Bulk student discounts & charges</h1>
          <p className="mt-1 text-sm text-[#766b63]">
            Apply the same adjustment to many students or prepare individualized rows.
          </p>
        </div>
        <Link href="/dashboard/finance" className="text-sm font-semibold text-[#81392e] hover:underline">
          Back to Finance Overview
        </Link>
      </header>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {result && (
        <div role="status" className={`rounded-lg border p-4 text-sm ${result.failedCount ? "border-amber-200 bg-amber-50 text-amber-900" : "border-green-200 bg-green-50 text-green-800"}`}>
          <p className="font-semibold">
            {result.createdCount} {kind === "discount" ? "discounts" : "charges"} saved
            {result.failedCount ? ` · ${result.failedCount} could not be saved` : ""}
          </p>
          {result.failures.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.failures.map((failure, index) => {
                const student = students.find((item) => item.id === failure.studentId);
                return (
                  <li key={`${failure.studentId}-${index}`}>
                    {student ? `${studentName(student)} (${student.admissionNumber}): ` : ""}
                    {failure.error}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-5 rounded-2xl border border-[#ebe4dc] bg-white p-5 shadow-sm md:grid-cols-3">
          <label className="text-sm font-semibold text-[#51443d]">
            Adjustment
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as "discount" | "charge");
                setFeeTypes(["TUITION"]);
              }}
              className="mt-1.5 w-full rounded-lg border border-[#ded4cb] bg-white px-3 py-2.5 font-normal"
            >
              <option value="discount">Discount</option>
              <option value="charge">Student-specific charge</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-[#51443d]">
            Academic year
            <select
              required
              value={academicYearId}
              onChange={(event) => {
                setAcademicYearId(event.target.value);
                setSelectedIds([]);
                setRowValues({});
              }}
              className="mt-1.5 w-full rounded-lg border border-[#ded4cb] bg-white px-3 py-2.5 font-normal"
            >
              <option value="">Select academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}{year.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold text-[#51443d]">Entry style</legend>
            <div className="mt-1.5 grid grid-cols-2 rounded-lg border border-[#ded4cb] bg-[#faf8f5] p-1">
              {[
                ["shared", "Shared"],
                ["sheet", "Sheet rows"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as "shared" | "sheet")}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === value ? "bg-white text-[#702d27] shadow-sm" : "text-[#776b61] hover:text-[#342724]"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="rounded-2xl border border-[#ebe4dc] bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-[#302925]">
            {kind === "discount" ? "Discount details" : "Charge details"}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kind === "discount" ? (
              <>
                <label className="text-sm font-medium text-[#51443d]">
                  Discount name *
                  <input required value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="e.g. Sibling discount" className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
                </label>
                {mode === "shared" && (
                  <label className="text-sm font-medium text-[#51443d]">
                    Discount percentage *
                    <input required type="number" min="0.01" max="100" step="0.01" value={percentage} onChange={(event) => setPercentage(event.target.value)} placeholder="e.g. 10" className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
                  </label>
                )}
                <fieldset className="md:col-span-2 xl:col-span-1">
                  <legend className="text-sm font-medium text-[#51443d]">Applies to fee types *</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {discountFeeTypes.map(([value, label]) => (
                      <label key={value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${feeTypes.includes(value) ? "border-[#d7b8a5] bg-[#f7ebe2] text-[#702d27]" : "border-[#e8dfd8] text-[#776b61]"}`}>
                        <input type="checkbox" checked={feeTypes.includes(value)} onChange={() => toggleFeeType(value)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            ) : (
              <>
                <label className="text-sm font-medium text-[#51443d]">
                  Charge description *
                  <input required value={description} onChange={(event) => setDescription(event.target.value)} maxLength={120} placeholder="e.g. Bus route 3" className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
                </label>
                <label className="text-sm font-medium text-[#51443d]">
                  Charge type *
                  <select value={chargeFeeType} onChange={(event) => setChargeFeeType(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#ded4cb] bg-white px-3 py-2.5">
                    {chargeFeeTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-[#51443d]">
                  Frequency *
                  <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#ded4cb] bg-white px-3 py-2.5">
                    {frequencies.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {mode === "shared" && (
                  <>
                    <label className="text-sm font-medium text-[#51443d]">
                      Quantity *
                      <input required type="number" min="0.01" step="0.01" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
                    </label>
                    <label className="text-sm font-medium text-[#51443d]">
                      Rate per unit (Rs.) *
                      <input required type="number" min="0" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
                    </label>
                  </>
                )}
              </>
            )}
            <label className="text-sm font-medium text-[#51443d]">
              Start date (BS) *
              <BikramDatePicker value={startDate} onChange={setStartDate} valueFormat="BS" className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
            </label>
            <label className="text-sm font-medium text-[#51443d]">
              End date (BS), optional
              <BikramDatePicker value={endDate} onChange={setEndDate} valueFormat="BS" className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
              {endDate && <button type="button" onClick={() => setEndDate("")} className="mt-1 text-xs text-[#81392e] hover:underline">Clear end date</button>}
            </label>
            <label className="text-sm font-medium text-[#51443d]">
              Notes, optional
              <input value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} className="mt-1.5 w-full rounded-lg border border-[#ded4cb] px-3 py-2.5" />
            </label>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[#ebe4dc] bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#eee8e2] p-5">
            <div>
              <h2 className="font-semibold text-[#302925]">Choose students</h2>
              <p className="mt-1 text-sm text-[#8e837a]">
                Only students enrolled in the selected academic year are shown.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="sr-only" htmlFor="student-adjustment-search">Search students</label>
              <input id="student-adjustment-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or admission no." className="w-56 rounded-lg border border-[#ded4cb] px-3 py-2 text-sm" />
              <span className="text-sm font-semibold text-[#702d27]">{selectedCount} selected</span>
            </div>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-[#766b63]">Loading students...</p>
          ) : !academicYearId ? (
            <p className="p-6 text-sm text-[#766b63]">Select an academic year first.</p>
          ) : visibleStudents.length === 0 ? (
            <p className="p-6 text-sm text-[#766b63]">No enrolled students match this search.</p>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#faf8f5] text-xs uppercase tracking-wide text-[#766b63]">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all visible students"
                        checked={
                          mode === "shared"
                            ? visibleStudents.every((student) => selectedIds.includes(student.id))
                            : visibleStudents.every((student) => rowValues[student.id]?.selected)
                        }
                        onChange={(event) => toggleVisible(event.target.checked)}
                      />
                    </th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    {mode === "sheet" && kind === "discount" && <th className="px-4 py-3">Discount %</th>}
                    {mode === "sheet" && kind === "charge" && (
                      <>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Rate (Rs.)</th>
                        <th className="px-4 py-3">Total (Rs.)</th>
                      </>
                    )}
                    {mode === "shared" && <th className="px-4 py-3">Adjustment</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ebe6]">
                  {visibleStudents.map((student) => {
                    const row = rowValues[student.id] ?? createEntryValues();
                    const selected = mode === "shared"
                      ? selectedIds.includes(student.id)
                      : row.selected;
                    const studentClass = student.enrollments.find(
                      (enrollment) => enrollment.academicYearId === academicYearId,
                    )?.class.name ?? "—";
                    return (
                      <tr key={student.id} className={selected ? "bg-[#fffaf6]" : "hover:bg-[#fcfbf9]"}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            aria-label={`Select ${studentName(student)}`}
                            onChange={(event) => {
                              if (mode === "shared") {
                                setSelectedIds((current) =>
                                  event.target.checked
                                    ? [...current, student.id]
                                    : current.filter((id) => id !== student.id),
                                );
                              } else {
                                updateRow(student.id, { selected: event.target.checked });
                              }
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#342724]">{studentName(student)}</p>
                          <p className="mt-0.5 text-xs text-[#8e837a]">{student.admissionNumber}</p>
                        </td>
                        <td className="px-4 py-3 text-[#685d55]">{studentClass}</td>
                        {mode === "shared" ? (
                          <td className="px-4 py-3 text-[#685d55]">
                            {kind === "discount"
                              ? (percentage ? `${percentage}% discount` : "Shared discount")
                              : (rate ? `Rs. ${(Number(rate) * Number(quantity || 0)).toLocaleString("en-NP")} charge` : "Shared charge")}
                          </td>
                        ) : kind === "discount" ? (
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="0.01"
                              max="100"
                              step="0.01"
                              value={row.percentage}
                              disabled={!row.selected}
                              onChange={(event) => updateRow(student.id, { percentage: event.target.value })}
                              placeholder="e.g. 10"
                              aria-label={`${studentName(student)} discount percentage`}
                              className="w-32 rounded-md border border-[#ded4cb] px-2.5 py-2 disabled:bg-gray-50"
                            />
                          </td>
                        ) : (
                          <>
                            <td className="px-4 py-2">
                              <input type="number" min="0.01" step="0.01" value={row.quantity} disabled={!row.selected} onChange={(event) => updateRow(student.id, { quantity: event.target.value })} aria-label={`${studentName(student)} quantity`} className="w-24 rounded-md border border-[#ded4cb] px-2.5 py-2 disabled:bg-gray-50" />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" min="0" step="0.01" value={row.rate} disabled={!row.selected} onChange={(event) => updateRow(student.id, { rate: event.target.value })} aria-label={`${studentName(student)} rate`} className="w-28 rounded-md border border-[#ded4cb] px-2.5 py-2 disabled:bg-gray-50" />
                            </td>
                            <td className="px-4 py-3 font-medium text-[#51443d]">
                              Rs. {(Number(row.quantity || 0) * Number(row.rate || 0)).toLocaleString("en-NP", { maximumFractionDigits: 2 })}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {mode === "sheet" && (
            <p className="border-t border-[#eee8e2] bg-[#faf8f5] px-5 py-3 text-xs text-[#766b63]">
              Select each row you want to submit, then enter that student’s {kind === "discount" ? "discount percentage" : "quantity and rate"}. Rows stay independent; invalid rows will be reported without discarding successful entries.
            </p>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#766b63]">
            {mode === "shared" && sharedFieldsValid
              ? "The same adjustment details will be used for every selected student."
              : mode === "shared"
                ? "Complete the shared adjustment details above."
                : "Spreadsheet values are entered per selected student."}
          </p>
          <button
            type="submit"
            disabled={saving || loading || selectedCount === 0 || !academicYearId}
            className="rounded-xl bg-[#702d27] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5d2521] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving records..." : `Save ${selectedCount} ${kind === "discount" ? "discounts" : "charges"}`}
          </button>
        </div>
      </form>
    </div>
  );
}
