
"use client";

import { useEffect, useRef, useState } from "react";
import NepaliDate from "nepali-date-converter";

type AcademicYear = {
  id: string;
  name: string;
  isActive: boolean;
};

type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName?: string | null;
};

type Charge = {
  id: string;
  studentId: string;
  academicYearId: string;
  feeType: string;
  description: string;
  quantity: number | string;
  rate: number | string;
  amount: number | string;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  student: Student;
  academicYear: AcademicYear;
};

type BSDateParts = {
  year: number;
  month: number;
  day: number;
};

const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
];

const feeTypes = [
  { value: "BUS", label: "Bus" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
];

const frequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "TERM", label: "Termly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "ONE_TIME", label: "One Time" },
];

function getTodayBS(): BSDateParts {
  const date = NepaliDate.fromAD(new Date());

  return {
    year: date.getYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

function formatBSDateValue(parts: BSDateParts): string {
  return `${parts.year}-${String(parts.month).padStart(
    2,
    "0"
  )}-${String(parts.day).padStart(2, "0")}`;
}

function parseBSDateValue(value: string): BSDateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 32
  ) {
    return null;
  }

  try {
    const converted = new NepaliDate(year, month - 1, day);

    if (
      converted.getYear() !== year ||
      converted.getMonth() + 1 !== month ||
      converted.getDate() !== day
    ) {
      return null;
    }

    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * Convert a BS date into an ISO timestamp for the existing API.
 * Noon UTC avoids accidental calendar-day shifts caused by time zones.
 * The database can continue storing Gregorian DateTime values.
 */
function bsDateToApiISO(value: string): string {
  const parts = parseBSDateValue(value);

  if (!parts) {
    throw new Error("Please select a valid Nepali date.");
  }

  const converted = new NepaliDate(
    parts.year,
    parts.month - 1,
    parts.day
  ).toJsDate();

  // Read the converted Gregorian calendar date in the browser's local time.
  const year = converted.getFullYear();
  const month = converted.getMonth() + 1;
  const day = converted.getDate();

  return new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  ).toISOString();
}

function apiDateToBSValue(value: string): string {
  const date = NepaliDate.fromAD(new Date(value));

  return formatBSDateValue({
    year: date.getYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

function formatBSDate(value?: string | null): string {
  if (!value) return "No end date";

  try {
    const parts = parseBSDateValue(apiDateToBSValue(value));

    if (!parts) return "Invalid date";

    return `${parts.day} ${BS_MONTHS[parts.month - 1]} ${parts.year} BS`;
  } catch {
    return "Invalid date";
  }
}

function getDaysInBSMonth(year: number, month: number): number {
  for (let day = 32; day >= 1; day--) {
    try {
      const converted = new NepaliDate(year, month - 1, day);

      if (
        converted.getYear() === year &&
        converted.getMonth() + 1 === month &&
        converted.getDate() === day
      ) {
        return day;
      }
    } catch {
      // Try the previous day.
    }
  }

  return 30;
}

function BSDatePicker({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const today = getTodayBS();
  const selected = parseBSDateValue(value);

  const year = selected?.year ?? today.year;
  const month = selected?.month ?? today.month;
  const day = selected?.day ?? today.day;

  const yearOptions = Array.from(
    { length: 31 },
    (_, index) => today.year - 15 + index
  );

  if (!yearOptions.includes(year)) {
    yearOptions.push(year);
    yearOptions.sort((a, b) => a - b);
  }

  const daysInMonth = getDaysInBSMonth(year, month);

  function updateDate(nextYear: number, nextMonth: number, nextDay: number) {
    const maximumDay = getDaysInBSMonth(nextYear, nextMonth);
    const safeDay = Math.min(nextDay, maximumDay);

    onChange(
      formatBSDateValue({
        year: nextYear,
        month: nextMonth,
        day: safeDay,
      })
    );
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {label} (BS)
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label={`${label} year in BS`}
          value={year}
          onChange={(event) =>
            updateDate(Number(event.target.value), month, day)
          }
          className="min-w-0 rounded-lg border border-gray-300 px-2 py-2"
        >
          {yearOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          aria-label={`${label} month in BS`}
          value={month}
          onChange={(event) =>
            updateDate(year, Number(event.target.value), day)
          }
          className="min-w-0 rounded-lg border border-gray-300 px-2 py-2"
        >
          {BS_MONTHS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label={`${label} day in BS`}
          value={day}
          onChange={(event) =>
            updateDate(year, month, Number(event.target.value))
          }
          className="min-w-0 rounded-lg border border-gray-300 px-2 py-2"
        >
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
            (option) => (
              <option key={option} value={option}>
                {option}
              </option>
            )
          )}
        </select>
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Nepali Bikram Sambat calendar
      </p>
    </div>
  );
}

export default function StudentChargesPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [feeType, setFeeType] = useState("BUS");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");

  const [startDate, setStartDate] = useState(() =>
    formatBSDateValue(getTodayBS())
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [chargesLoading, setChargesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initialLoadStartedRef = useRef(false);
  const initializedRef = useRef(false);
  const chargeRequestRef = useRef(0);

  useEffect(() => {
    if (initialLoadStartedRef.current) return;

    initialLoadStartedRef.current = true;
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [yearsResponse, studentsResponse] = await Promise.all([
        fetch("/api/academic-years"),
        fetch("/api/students"),
      ]);

      if (!yearsResponse.ok || !studentsResponse.ok) {
        throw new Error("Failed to load academic years or students.");
      }

      const yearsData = await yearsResponse.json();
      const studentsData = await studentsResponse.json();

      const years: AcademicYear[] = Array.isArray(yearsData)
        ? yearsData
        : yearsData.academicYears ?? [];

      const studentList: Student[] = Array.isArray(studentsData)
        ? studentsData
        : studentsData.students ?? [];

      setAcademicYears(years);
      setStudents(studentList);

      const activeYear = years.find((year) => year.isActive) ?? years[0];

      if (!activeYear) {
        setAcademicYearId("");
        setCharges([]);
        initializedRef.current = true;
        return;
      }

      setAcademicYearId(activeYear.id);
      await loadCharges(activeYear.id);
      initializedRef.current = true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initializedRef.current) return;

    if (!academicYearId) {
      chargeRequestRef.current += 1;
      setCharges([]);
      setChargesLoading(false);
      return;
    }

    void loadCharges(academicYearId);
  }, [academicYearId]);

  async function loadCharges(yearId: string) {
    const requestId = ++chargeRequestRef.current;

    try {
      setChargesLoading(true);
      setError("");

      const response = await fetch(
        `/api/student-charges?academicYearId=${encodeURIComponent(yearId)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load student charges.");
      }

      const data = await response.json();
      const chargeList: Charge[] = Array.isArray(data)
        ? data
        : data.charges ?? [];

      if (requestId === chargeRequestRef.current) {
        setCharges(chargeList);
      }
    } catch (err) {
      if (requestId === chargeRequestRef.current) {
        setCharges([]);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load student charges."
        );
      }
    } finally {
      if (requestId === chargeRequestRef.current) {
        setChargesLoading(false);
      }
    }
  }

  function resetForm() {
    setStudentId("");
    setFeeType("BUS");
    setDescription("");
    setQuantity("1");
    setRate("");
    setFrequency("MONTHLY");
    setStartDate(formatBSDateValue(getTodayBS()));
    setEndDate("");
    setNotes("");
    setEditingId(null);
  }

  function startEditing(charge: Charge) {
    setEditingId(charge.id);
    setStudentId(charge.studentId);
    setFeeType(charge.feeType);
    setDescription(charge.description);
    setQuantity(String(charge.quantity));
    setRate(String(charge.rate));
    setFrequency(charge.frequency);

    try {
      setStartDate(apiDateToBSValue(charge.startDate));
      setEndDate(
        charge.endDate ? apiDateToBSValue(charge.endDate) : ""
      );
    } catch {
      setError(
        "Could not convert this charge's saved date. Check the date returned by the API."
      );
      return;
    }

    setNotes(charge.notes ?? "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!academicYearId) {
      setError("Please select an academic year.");
      return;
    }

    if (!studentId) {
      setError("Please select a student.");
      return;
    }

    if (!description.trim()) {
      setError("Charge description is required.");
      return;
    }

    const numericQuantity = Number(quantity);
    const numericRate = Number(rate);

    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    if (!Number.isFinite(numericRate) || numericRate < 0) {
      setError("Rate must be a valid amount.");
      return;
    }

    const startParts = parseBSDateValue(startDate);
    const endParts = endDate ? parseBSDateValue(endDate) : null;

    if (!startParts) {
      setError("Please select a valid BS start date.");
      return;
    }

    if (endDate && !endParts) {
      setError("Please select a valid BS end date.");
      return;
    }

    if (endParts) {
      const startKey =
        startParts.year * 10000 +
        startParts.month * 100 +
        startParts.day;

      const endKey =
        endParts.year * 10000 +
        endParts.month * 100 +
        endParts.day;

      if (endKey < startKey) {
        setError("End date cannot be before start date.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");

      const body = {
        studentId,
        academicYearId,
        feeType,
        description: description.trim(),
        quantity: numericQuantity,
        rate: numericRate,
        frequency,
        startDate: bsDateToApiISO(startDate),
        endDate: endDate ? bsDateToApiISO(endDate) : null,
        notes: notes.trim() || null,
      };

      const response = await fetch("/api/student-charges", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editingId ? { id: editingId, ...body } : body
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save student charge."
        );
      }

      resetForm();
      await loadCharges(academicYearId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save student charge."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCharge(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student charge?"
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `/api/student-charges?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete charge.");
      }

      if (editingId === id) resetForm();

      await loadCharges(academicYearId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete charge."
      );
    }
  }

  function getFeeTypeLabel(value: string) {
    return feeTypes.find((type) => type.value === value)?.label ?? value;
  }

  function getFrequencyLabel(value: string) {
    return (
      frequencies.find((item) => item.value === value)?.label ?? value
    );
  }

  function getStudentName(student: Student) {
    return [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const filteredCharges = charges.filter((charge) => {
    const searchText = search.trim().toLowerCase();
    if (!searchText) return true;

    const studentName = getStudentName(charge.student).toLowerCase();

    return (
      studentName.includes(searchText) ||
      charge.student.admissionNumber.toLowerCase().includes(searchText) ||
      charge.description.toLowerCase().includes(searchText)
    );
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Student Charges</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage additional or student-specific charges for each academic year.
          Dates are entered and displayed in the Nepali BS calendar.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select Academic Year</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>
            <select
              value={academicYearId}
              onChange={(event) => setAcademicYearId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Select academic year</option>
              {academicYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}{year.isActive ? " (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Search</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Student, admission number or charge..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId ? "Edit Student Charge" : "Add Student Charge"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Define an additional charge for a specific student.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Student</label>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              disabled={!!editingId}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
            >
              <option value="">Select student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {getStudentName(student)} — {student.admissionNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Charge Type</label>
            <select
              value={feeType}
              onChange={(event) => setFeeType(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {feeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <input
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. School Bus Fee"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Frequency</label>
            <select
              value={frequency}
              onChange={(event) => setFrequency(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {frequencies.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Quantity</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Rate (Rs.)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              placeholder="1500"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <BSDatePicker
            label="Start Date"
            value={startDate}
            onChange={setStartDate}
            required
          />

          <div>
            <BSDatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
            />
            <button
              type="button"
              onClick={() => setEndDate("")}
              className="mt-2 text-xs font-medium text-gray-600 underline hover:text-gray-900"
            >
              Clear end date
            </button>
            <p className="mt-1 text-xs text-gray-500">
              Leave blank if the charge has no planned end date.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {rate !== "" &&
            quantity !== "" &&
            Number.isFinite(Number(quantity)) &&
            Number.isFinite(Number(rate)) && (
              <div className="rounded-lg bg-gray-50 p-4 text-sm md:col-span-2">
                <span className="text-gray-500">Total Charge: </span>
                <span className="font-semibold">
                  Rs.{" "}
                  {(Number(quantity) * Number(rate)).toLocaleString()}
                </span>
              </div>
            )}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving || !academicYearId}
              className="rounded-lg bg-red-700 px-5 py-2.5 font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Charge"
                  : "Add Charge"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold">Student Charges</h2>
        </div>

        {loading || chargesLoading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading student charges...
          </div>
        ) : filteredCharges.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No student charges have been configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Charge</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Amount</th>
                  <th className="px-6 py-3 font-medium">Frequency</th>
                  <th className="px-6 py-3 font-medium">Start Date (BS)</th>
                  <th className="px-6 py-3 font-medium">End Date (BS)</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredCharges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="px-6 py-4">
                      <div className="font-medium">
                        {getStudentName(charge.student)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {charge.student.admissionNumber}
                      </div>
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {charge.description}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getFeeTypeLabel(charge.feeType)}
                    </td>

                    <td className="px-6 py-4">
                      Rs. {Number(charge.amount).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getFrequencyLabel(charge.frequency)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatBSDate(charge.startDate)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatBSDate(charge.endDate)}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => startEditing(charge)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void deleteCharge(charge.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
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
