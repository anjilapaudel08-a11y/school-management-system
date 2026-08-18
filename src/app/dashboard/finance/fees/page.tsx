"use client";

import { useEffect, useRef, useState } from "react";

type AcademicYear = {
  id: string;
  name: string;
  isActive: boolean;
};

type SchoolClass = {
  id: string;
  name: string;
  order: number;
};

type Fee = {
  id: string;
  academicYearId: string;
  classId: string;
  feeType: string;
  name: string;
  amount: number;
  frequency: string;
  isActive: boolean;
};

const feeTypes = [
  { value: "TUITION", label: "Tuition" },
  { value: "ADMISSION", label: "Admission" },
  { value: "COMPUTER_LAB", label: "Computer Lab" },
  { value: "EXAM", label: "Exam" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
];

const frequencies = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "TERM", label: "Termly" },
  { value: "ANNUAL", label: "Annual" },
  { value: "ONE_TIME", label: "One Time" },
];

export default function FeeStructurePage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");

  const [feeType, setFeeType] = useState("TUITION");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("MONTHLY");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [feesLoading, setFeesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Prevent the initial data request from running more than once.
  const initialLoadStartedRef = useRef(false);

  // Becomes true after the first academic year/class/fee data is loaded.
  const initializedRef = useRef(false);

  // Used to prevent an older fee request from overwriting a newer one.
  const feeRequestRef = useRef(0);

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

      const [yearsResponse, classesResponse] = await Promise.all([
        fetch("/api/academic-years"),
        fetch("/api/classes"),
      ]);

      if (!yearsResponse.ok || !classesResponse.ok) {
        throw new Error(
          "Failed to load academic years or classes."
        );
      }

      const yearsData = await yearsResponse.json();
      const classesData = await classesResponse.json();

      const years = Array.isArray(yearsData)
        ? yearsData
        : yearsData.academicYears ?? [];

      const classList = Array.isArray(classesData)
        ? classesData
        : classesData.classes ?? [];

      setAcademicYears(years);
      setClasses(classList);

      const activeYear =
        years.find((year: AcademicYear) => year.isActive) ??
        years[0];

      const firstClass = classList[0];

      if (!activeYear || !firstClass) {
        setAcademicYearId("");
        setClassId("");
        setFees([]);
        initializedRef.current = true;
        return;
      }

      const initialYearId = activeYear.id;
      const initialClassId = firstClass.id;

      setAcademicYearId(initialYearId);
      setClassId(initialClassId);

      // Load the initial fee list exactly once.
      await loadFees(initialYearId, initialClassId);

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

  /*
   * After initial loading is complete, load fees whenever
   * the user changes the academic year or class.
   */
  useEffect(() => {
    if (!initializedRef.current) {
      return;
    }

    if (!academicYearId || !classId) {
      setFees([]);
      return;
    }

    loadFees(academicYearId, classId);
  }, [academicYearId, classId]);

  async function loadFees(
    yearId: string,
    selectedClassId: string
  ) {
    const requestId = ++feeRequestRef.current;

    try {
      setFeesLoading(true);
      setError("");

      const response = await fetch(
        `/api/fees?academicYearId=${yearId}&classId=${selectedClassId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load fees.");
      }

      const data = await response.json();

      const feeList = Array.isArray(data)
        ? data
        : data.fees ?? [];

      /*
       * Only apply the result if this is still the
       * latest fee request.
       */
      if (requestId === feeRequestRef.current) {
        setFees(feeList);
      }
    } catch (err) {
      if (requestId === feeRequestRef.current) {
        setFees([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load fees."
        );
      }
    } finally {
      if (requestId === feeRequestRef.current) {
        setFeesLoading(false);
      }
    }
  }

  function resetForm() {
    setFeeType("TUITION");
    setName("");
    setAmount("");
    setFrequency("MONTHLY");
    setEditingId(null);
  }

  function startEditing(fee: Fee) {
    setEditingId(fee.id);
    setFeeType(fee.feeType);
    setName(fee.name);
    setAmount(String(fee.amount));
    setFrequency(fee.frequency);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!academicYearId || !classId) {
      setError("Please select an academic year and class.");
      return;
    }

    if (!name.trim()) {
      setError("Fee name is required.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const body = {
        academicYearId,
        classId,
        feeType,
        name: name.trim(),
        amount: Number(amount),
        frequency,
      };

      let response: Response;

      if (editingId) {
        response = await fetch("/api/fees", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingId,
            feeType,
            name: name.trim(),
            amount: Number(amount),
            frequency,
          }),
        });
      } else {
        response = await fetch("/api/fees", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save fee."
        );
      }

      resetForm();

      await loadFees(
        academicYearId,
        classId
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save fee."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleFee(fee: Fee) {
    try {
      setError("");

      const response = await fetch("/api/fees", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: fee.id,
          isActive: !fee.isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update fee."
        );
      }

      await loadFees(
        academicYearId,
        classId
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update fee."
      );
    }
  }

  async function deleteFee(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this fee?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `/api/fees?id=${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete fee."
        );
      }

      if (editingId === id) {
        resetForm();
      }

      await loadFees(
        academicYearId,
        classId
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete fee."
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
        (frequency) => frequency.value === value
      )?.label ?? value
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Fee Structure
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Configure the fees charged to students for each
          class and academic year.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">
          Select Class
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(event) =>
                setAcademicYearId(event.target.value)
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
              Class
            </label>

            <select
              value={classId}
              onChange={(event) =>
                setClassId(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">
                Select class
              </option>

              {classes.map((schoolClass) => (
                <option
                  key={schoolClass.id}
                  value={schoolClass.id}
                >
                  {schoolClass.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Add/Edit Fee */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId
                ? "Edit Fee"
                : "Add Fee"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Define how this fee should be charged.
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
          <div>
            <label className="mb-1 block text-sm font-medium">
              Fee Type
            </label>

            <select
              value={feeType}
              onChange={(event) =>
                setFeeType(event.target.value)
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

          <div>
            <label className="mb-1 block text-sm font-medium">
              Fee Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. Tuition Fee"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Amount
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="3500"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Frequency
            </label>

            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value)
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

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Fee"
                  : "Add Fee"}
            </button>
          </div>
        </form>
      </section>

      {/* Fee List */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <h2 className="text-lg font-semibold">
            Fees for Selected Class
          </h2>
        </div>

        {loading || feesLoading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading fees...
          </div>
        ) : fees.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No fees have been configured for this class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    Fee
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
                {fees.map((fee) => (
                  <tr key={fee.id}>
                    <td className="px-6 py-4 font-medium">
                      {fee.name}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getFeeTypeLabel(fee.feeType)}
                    </td>

                    <td className="px-6 py-4">
                      Rs.{" "}
                      {Number(
                        fee.amount
                      ).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getFrequencyLabel(
                        fee.frequency
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFee(fee)
                        }
                        aria-label={
                          fee.isActive
                            ? "Deactivate fee"
                            : "Activate fee"
                        }
                        className="inline-flex items-center gap-2 rounded-md outline-none"
                      >
                        <span
                          className={`relative flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
                            fee.isActive
                              ? "bg-green-500"
                              : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                              fee.isActive
                                ? "translate-x-5"
                                : "translate-x-1"
                            }`}
                          />
                        </span>

                        <span
                          className={`text-xs font-medium ${
                            fee.isActive
                              ? "text-green-700"
                              : "text-gray-500"
                          }`}
                        >
                          {fee.isActive
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
                            startEditing(fee)
                          }
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            deleteFee(fee.id)
                          }
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