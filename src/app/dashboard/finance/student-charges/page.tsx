"use client";

import { useEffect, useRef, useState } from "react";

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
  isActive: boolean;
  notes?: string | null;
  student: Student;
  academicYear: AcademicYear;
};

const feeTypes = [
  { value: "BUS", label: "Bus" },
 
  {
    value: "MISCELLANEOUS",
    label: "Miscellaneous",
  },
];

const frequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "TERM", label: "Termly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "ONE_TIME", label: "One Time" },
];

export default function StudentChargesPage() {
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [charges, setCharges] = useState<Charge[]>([]);

  const [academicYearId, setAcademicYearId] =
    useState("");

  const [studentId, setStudentId] = useState("");
  const [feeType, setFeeType] = useState("BUS");
  const [description, setDescription] =
    useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [frequency, setFrequency] =
    useState("MONTHLY");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);
  const [chargesLoading, setChargesLoading] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initialLoadStartedRef = useRef(false);
  const initializedRef = useRef(false);
  const chargeRequestRef = useRef(0);

  useEffect(() => {
    if (initialLoadStartedRef.current) {
      return;
    }

    initialLoadStartedRef.current = true;

    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError("");

      const [
        yearsResponse,
        studentsResponse,
      ] = await Promise.all([
        fetch("/api/academic-years"),
        fetch("/api/students"),
      ]);

      if (
        !yearsResponse.ok ||
        !studentsResponse.ok
      ) {
        throw new Error(
          "Failed to load academic years or students."
        );
      }

      const yearsData =
        await yearsResponse.json();

      const studentsData =
        await studentsResponse.json();

      const years = Array.isArray(yearsData)
        ? yearsData
        : yearsData.academicYears ?? [];

      const studentList = Array.isArray(
        studentsData
      )
        ? studentsData
        : studentsData.students ?? [];

      setAcademicYears(years);
      setStudents(studentList);

      const activeYear =
        years.find(
          (year: AcademicYear) =>
            year.isActive
        ) ?? years[0];

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
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    if (!academicYearId) {
      setCharges([]);
      return;
    }

    loadCharges(academicYearId);
  }, [academicYearId]);

  async function loadCharges(yearId: string) {
    const requestId =
      ++chargeRequestRef.current;

    try {
      setChargesLoading(true);
      setError("");

      const response = await fetch(
        `/api/student-charges?academicYearId=${yearId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load student charges."
        );
      }

      const data = await response.json();

      const chargeList = Array.isArray(data)
        ? data
        : data.charges ?? [];

      if (
        requestId ===
        chargeRequestRef.current
      ) {
        setCharges(chargeList);
      }
    } catch (err) {
      if (
        requestId ===
        chargeRequestRef.current
      ) {
        setCharges([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load student charges."
        );
      }
    } finally {
      if (
        requestId ===
        chargeRequestRef.current
      ) {
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
    setStartDate(
      new Date().toISOString().split("T")[0]
    );
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

    setStartDate(
      new Date(charge.startDate)
        .toISOString()
        .split("T")[0]
    );

    setEndDate(
      charge.endDate
        ? new Date(charge.endDate)
            .toISOString()
            .split("T")[0]
        : ""
    );

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

    if (!quantity || Number(quantity) <= 0) {
      setError(
        "Quantity must be greater than 0."
      );
      return;
    }

    if (!rate || Number(rate) < 0) {
      setError(
        "Rate must be a valid amount."
      );
      return;
    }

    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    if (
      endDate &&
      new Date(endDate) <
        new Date(startDate)
    ) {
      setError(
        "End date cannot be before start date."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      const body = {
        studentId,
        academicYearId,
        feeType,
        description: description.trim(),
        quantity: Number(quantity),
        rate: Number(rate),
        frequency,
        startDate,
        endDate: endDate || null,
        notes: notes.trim() || null,
      };

      let response: Response;

      if (editingId) {
        response = await fetch(
          "/api/student-charges",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: editingId,
              ...body,
            }),
          }
        );
      } else {
        response = await fetch(
          "/api/student-charges",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to save student charge."
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

  async function toggleCharge(charge: Charge) {
    try {
      setError("");

      const response = await fetch(
        "/api/student-charges",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: charge.id,
            isActive: !charge.isActive,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update charge."
        );
      }

      await loadCharges(academicYearId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update charge."
      );
    }
  }

  async function deleteCharge(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this student charge?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/student-charges?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete charge."
        );
      }

      if (editingId === id) {
        resetForm();
      }

      await loadCharges(academicYearId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete charge."
      );
    }
  }

  function getFeeTypeLabel(value: string) {
    return (
      feeTypes.find(
        (type) => type.value === value
      )?.label ?? value
    );
  }

  function getFrequencyLabel(value: string) {
    return (
      frequencies.find(
        (frequency) =>
          frequency.value === value
      )?.label ?? value
    );
  }

  function getStudentName(
    student: Student
  ) {
    return [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  const filteredCharges = charges.filter(
    (charge) => {
      const searchText =
        search.trim().toLowerCase();

      const studentName =
        getStudentName(
          charge.student
        ).toLowerCase();

      const matchesSearch =
        !searchText ||
        studentName.includes(searchText) ||
        charge.student.admissionNumber
          .toLowerCase()
          .includes(searchText) ||
        charge.description
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" &&
          charge.isActive) ||
        (statusFilter === "INACTIVE" &&
          !charge.isActive);

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          Student Charges
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Manage additional or student-specific
          charges for each academic year.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Select Academic Year
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(event) =>
                setAcademicYearId(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">
                Select academic year
              </option>

              {academicYears.map((year) => (
                <option
                  key={year.id}
                  value={year.id}
                >
                  {year.name}
                  {year.isActive
                    ? " (Active)"
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Search
            </label>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Student, admission number or charge..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 md:w-1/2">
          <label className="mb-1 block text-sm font-medium">
            Status
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">
              Active
            </option>
            <option value="INACTIVE">
              Inactive
            </option>
          </select>
        </div>
      </section>

      {/* Add/Edit Charge */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId
                ? "Edit Student Charge"
                : "Add Student Charge"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Define an additional charge for a
              specific student.
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

        <form
          onSubmit={handleSubmit}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          {/* Student */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Student
            </label>

            <select
              value={studentId}
              onChange={(event) =>
                setStudentId(
                  event.target.value
                )
              }
              disabled={!!editingId}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"
            >
              <option value="">
                Select student
              </option>

              {students.map((student) => (
                <option
                  key={student.id}
                  value={student.id}
                >
                  {getStudentName(student)} —{" "}
                  {student.admissionNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Fee Type */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Charge Type
            </label>

            <select
              value={feeType}
              onChange={(event) =>
                setFeeType(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {feeTypes.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <input
              type="text"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="e.g. School Bus Fee"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Frequency
            </label>

            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {frequencies.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Quantity
            </label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(event) =>
                setQuantity(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Rate */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Rate
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={rate}
              onChange={(event) =>
                setRate(event.target.value)
              }
              placeholder="1500"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              End Date
            </label>

            <input
              type="date"
              value={endDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Notes
            </label>

            <textarea
              rows={3}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Optional notes..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Calculated amount */}
          {rate && quantity && (
            <div className="rounded-lg bg-gray-50 p-4 text-sm md:col-span-2">
              <span className="text-gray-500">
                Total Charge:{" "}
              </span>

              <span className="font-semibold">
                Rs.{" "}
                {(
                  Number(quantity) *
                  Number(rate)
                ).toLocaleString()}
              </span>
            </div>
          )}

          {/* Button */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* Charge List */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold">
            Student Charges
          </h2>
        </div>

        {loading || chargesLoading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading student charges...
          </div>
        ) : filteredCharges.length ===
          0 ? (
          <div className="p-6 text-sm text-gray-500">
            No student charges have been
            configured.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    Student
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Charge
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Type
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Amount
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Frequency
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-6 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {filteredCharges.map(
                  (charge) => (
                    <tr key={charge.id}>
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {getStudentName(
                            charge.student
                          )}
                        </div>

                        <div className="text-sm text-gray-500">
                          {
                            charge.student
                              .admissionNumber
                          }
                        </div>
                      </td>

                      <td className="px-6 py-4 font-medium">
                        {charge.description}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getFeeTypeLabel(
                          charge.feeType
                        )}
                      </td>

                      <td className="px-6 py-4">
                        Rs.{" "}
                        {Number(
                          charge.amount
                        ).toLocaleString()}
                      </td>

                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getFrequencyLabel(
                          charge.frequency
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            toggleCharge(
                              charge
                            )
                          }
                          aria-label={
                            charge.isActive
                              ? "Deactivate charge"
                              : "Activate charge"
                          }
                          className="inline-flex items-center gap-2 rounded-md outline-none"
                        >
                          <span
                            className={`relative flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
                              charge.isActive
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                                charge.isActive
                                  ? "translate-x-5"
                                  : "translate-x-1"
                              }`}
                            />
                          </span>

                          <span
                            className={`text-xs font-medium ${
                              charge.isActive
                                ? "text-green-700"
                                : "text-gray-500"
                            }`}
                          >
                            {charge.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                charge
                              )
                            }
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteCharge(
                                charge.id
                              )
                            }
                            className="text-sm font-medium text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}