"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { BikramDatePicker } from "@inicrea/bikram-sambat-react";
import {
  adToBs,
  bsToAdIso,
} from "@inicrea/bikram-sambat-core";
import { formatBSDate } from "@/lib/nepali-date";

import "@inicrea/bikram-sambat-react/styles.css";

type AcademicYear = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
};

type DiscountFeeType = {
  id: string;
  discountId: string;
  feeType: string;
};

type StudentDiscount = {
  id: string;
  studentId: string;
  academicYearId: string;
  name: string;
  percentage: string | number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  student: Student;
  academicYear: AcademicYear;
  feeTypes: DiscountFeeType[];
};

const feeTypes = [
  { value: "TUITION", label: "Tuition" },
  { value: "ADMISSION", label: "Admission" },
  { value: "COMPUTER_LAB", label: "Computer Lab" },
  { value: "EXAM", label: "Exam" },
];

const pad2 = (value: number) =>
  String(value).padStart(2, "0");

function getStudentName(student: Student) {
  return [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Converts a selected BS date to a Gregorian AD date.
 * The API and Prisma continue receiving YYYY-MM-DD AD dates.
 */
function bsToAdDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    value
  );

  if (!match) {
    throw new Error("Please select a valid BS date.");
  }

  const [, year, month, day] = match;

  return bsToAdIso({
    year: Number(year),
    month: Number(month),
    day: Number(day),
  });
}

/**
 * Converts a Gregorian date from the API into a BS date
 * for the calendar picker.
 */
function adToBsInput(
  value: string | null | undefined
): string {
  if (!value) return "";

  const adDate = value.slice(0, 10);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    adDate
  );

  if (!match) return "";

  const [, year, month, day] = match;

  const bsDate = adToBs(
    `${year}-${month}-${day}`
  );

  return [
    bsDate.year,
    pad2(bsDate.month),
    pad2(bsDate.day),
  ].join("-");
}

function formatBsDate(
  value: string | null | undefined
): string {
  if (!value) return "No end date";
  return formatBSDate(value);
}

export default function DiscountsPage() {
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [students, setStudents] = useState<Student[]>([]);

  const [discounts, setDiscounts] = useState<
    StudentDiscount[]
  >([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [selectedFeeTypes, setSelectedFeeTypes] = useState<
    string[]
  >([]);

  // Store the form dates as BS strings.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initializedRef = useRef(false);

  const loadAcademicYears = async () => {
    try {
      const response = await fetch("/api/academic-years");

      if (!response.ok) {
        throw new Error("Failed to fetch academic years.");
      }

      const data: AcademicYear[] = await response.json();

      setAcademicYears(data);

      if (data.length > 0) {
        setAcademicYearId(
          (current) => current || data[0].id
        );
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load academic years.");
    }
  };

  const loadStudents = async () => {
    try {
      const response = await fetch("/api/students");

      if (!response.ok) {
        throw new Error("Failed to fetch students.");
      }

      const data: Student[] = await response.json();

      setStudents(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load students.");
    }
  };

  const loadDiscounts = async (yearId: string) => {
    if (!yearId) {
      setDiscounts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/student-discounts?academicYearId=${encodeURIComponent(
          yearId
        )}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch discounts.");
      }

      const data: StudentDiscount[] = await response.json();

      setDiscounts(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load discounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;

    initializedRef.current = true;

    Promise.all([
      loadAcademicYears(),
      loadStudents(),
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!academicYearId) return;

    loadDiscounts(academicYearId);
  }, [academicYearId]);

  const resetForm = () => {
    setStudentId("");
    setName("");
    setPercentage("");
    setSelectedFeeTypes([]);
    setStartDate("");
    setEndDate("");
    setNotes("");
    setEditingId(null);
  };

  const handleFeeTypeToggle = (feeType: string) => {
    setSelectedFeeTypes((current) =>
      current.includes(feeType)
        ? current.filter((item) => item !== feeType)
        : [...current, feeType]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (!academicYearId) {
      setError("Please select an academic year.");
      return;
    }

    if (!studentId && !editingId) {
      setError("Please select a student.");
      return;
    }

    if (!name.trim()) {
      setError("Discount name is required.");
      return;
    }

    const numericPercentage = Number(percentage);

    if (
      !Number.isFinite(numericPercentage) ||
      numericPercentage <= 0 ||
      numericPercentage > 100
    ) {
      setError(
        "Discount percentage must be greater than 0 and cannot exceed 100."
      );
      return;
    }

    if (!selectedFeeTypes.length) {
      setError("Please select at least one fee type.");
      return;
    }

    if (!startDate) {
      setError("Please select a BS start date.");
      return;
    }

    let adStartDate: string;
    let adEndDate: string | null;

    try {
      adStartDate = bsToAdDate(startDate);

      // End date is optional.
      adEndDate = endDate
        ? bsToAdDate(endDate)
        : null;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Please select valid calendar dates."
      );
      return;
    }

    if (adEndDate && adEndDate < adStartDate) {
      setError(
        "End date cannot be before the start date."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        ...(!editingId ? { studentId } : {}),
        ...(!editingId ? { academicYearId } : {}),
        name: name.trim(),
        percentage: numericPercentage,
        feeTypes: selectedFeeTypes,

        // Send AD dates to the API, not BS dates.
        startDate: adStartDate,
        endDate: adEndDate,

        notes: notes.trim() || null,
      };

      const response = await fetch(
        "/api/student-discounts",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save discount."
        );
      }

      resetForm();
      await loadDiscounts(academicYearId);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save discount."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (discount: StudentDiscount) => {
    setError("");

    setEditingId(discount.id);
    setStudentId(discount.studentId);
    setName(discount.name);
    setPercentage(String(discount.percentage));

    setSelectedFeeTypes(
      discount.feeTypes.map((item) => item.feeType)
    );

    // Convert stored AD dates back to BS for the pickers.
    setStartDate(adToBsInput(discount.startDate));
    setEndDate(adToBsInput(discount.endDate));

    setNotes(discount.notes || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleToggleStatus = async (
    discount: StudentDiscount
  ) => {
    try {
      setError("");

      const response = await fetch(
        "/api/student-discounts",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: discount.id,
            isActive: !discount.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update discount status."
        );
      }

      await loadDiscounts(academicYearId);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update discount status."
      );
    }
  };

  const handleDelete = async (
    discount: StudentDiscount
  ) => {
    const confirmed = window.confirm(
      `Delete "${discount.name}" for ${getStudentName(
        discount.student
      )}?`
    );

    if (!confirmed) return;

    try {
      setError("");

      const response = await fetch(
        `/api/student-discounts?id=${encodeURIComponent(
          discount.id
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete discount."
        );
      }

      if (editingId === discount.id) {
        resetForm();
      }

      await loadDiscounts(academicYearId);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete discount."
      );
    }
  };

  const filteredDiscounts = discounts.filter(
    (discount) => {
      const searchText = [
        getStudentName(discount.student),
        discount.student.admissionNumber,
        discount.name,
        ...discount.feeTypes.map((item) => item.feeType),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(
        search.toLowerCase()
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && discount.isActive) ||
        (statusFilter === "INACTIVE" && !discount.isActive);

      return matchesSearch && matchesStatus;
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Student Discounts
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage percentage-based discounts for class-based
          fees using the Bikram Sambat calendar.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? "Edit Discount" : "Add Discount"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select dates using the BS calendar. Leave the end
            date blank for a discount without a fixed expiry.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Academic Year */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Academic Year
              </label>

              <select
                value={academicYearId}
                onChange={(event) =>
                  setAcademicYearId(event.target.value)
                }
                disabled={!!editingId}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Select academic year</option>

                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Student */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Student
              </label>

              <select
                value={studentId}
                onChange={(event) =>
                  setStudentId(event.target.value)
                }
                disabled={!!editingId}
                required={!editingId}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Select student</option>

                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.admissionNumber} —{" "}
                    {getStudentName(student)}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Discount Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Merit Discount"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            {/* Percentage */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Discount Percentage
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={percentage}
                  onChange={(event) =>
                    setPercentage(event.target.value)
                  }
                  placeholder="e.g. 20"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10"
                />

                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  %
                </span>
              </div>
            </div>

            {/* BS Start Date */}
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Start Date (BS) <span className="text-red-600">*</span>
              </label>

              <BikramDatePicker
                value={startDate}
                onChange={(value) => setStartDate(value)}
                valueFormat="BS"
              />

              {startDate && (
                <p className="mt-2 text-xs text-gray-500">
                  Selected BS date: {startDate}
                </p>
              )}
            </div>

            {/* Optional BS End Date */}
            <div className="min-w-0">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-gray-700">
                  End Date (BS)
                  <span className="ml-1 font-normal text-gray-400">
                    Optional
                  </span>
                </label>

                {endDate && (
                  <button
                    type="button"
                    onClick={() => setEndDate("")}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Clear date
                  </button>
                )}
              </div>

              <BikramDatePicker
                value={endDate}
                onChange={(value) => setEndDate(value)}
                valueFormat="BS"
              />

              <p className="mt-2 text-xs text-gray-500">
                {endDate
                  ? `Selected BS date: ${endDate}`
                  : "Leave blank if the discount has no fixed end date."}
              </p>
            </div>
          </div>

          {/* Fee Types */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Applies To
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {feeTypes.map((feeType) => {
                const checked = selectedFeeTypes.includes(
                  feeType.value
                );

                return (
                  <label
                    key={feeType.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      checked
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        handleFeeTypeToggle(feeType.value)
                      }
                      className="h-4 w-4"
                    />

                    <span className="text-sm text-gray-700">
                      {feeType.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Bus and Miscellaneous charges are not eligible
              for discounts. Use waivers for those exceptions.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-red-700 px-5 py-2.5 font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Discount"
                  : "Add Discount"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Discount List */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Discounts
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredDiscounts.length} discount
              {filteredDiscounts.length !== 1 ? "s" : ""} found.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student or discount..."
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">
            Loading discounts...
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">
            No discounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                  <th className="px-4 py-3 font-medium">
                    Student
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Discount
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Applies To
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Percentage
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Period (BS)
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredDiscounts.map((discount) => (
                  <tr key={discount.id} className="text-sm">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {getStudentName(discount.student)}
                      </div>

                      <div className="text-xs text-gray-500">
                        {discount.student.admissionNumber}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900">
                        {discount.name}
                      </div>

                      {discount.notes && (
                        <div className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {discount.notes}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {discount.feeTypes.map((item) => {
                          const label =
                            feeTypes.find(
                              (fee) => fee.value === item.feeType
                            )?.label || item.feeType;

                          return (
                            <span
                              key={item.id}
                              className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-semibold text-gray-900">
                      {discount.percentage}%
                    </td>

                    <td className="px-4 py-4 text-gray-600">
                      <div>
                        {formatBsDate(discount.startDate)}
                      </div>

                      <div className="text-xs text-gray-400">
                        to {formatBsDate(discount.endDate)}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleStatus(discount)
                        }
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          discount.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {discount.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(discount)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(discount)}
                          className="text-red-600 hover:text-red-800"
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
      </div>
    </div>
  );
}