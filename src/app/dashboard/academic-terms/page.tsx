"use client";

import { useEffect, useState } from "react";

type AcademicYear = {
  id: string;
  name: string;
  isActive: boolean;
};

type AcademicTerm = {
  id: string;
  name: string;
  order: number;
  academicYear: AcademicYear;
  _count: {
    exams: number;
  };
};

export default function AcademicTermsPage() {
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchAcademicYears() {
    const response = await fetch("/api/academic-years");

    if (!response.ok) {
      throw new Error("Failed to fetch academic years.");
    }

    const data = await response.json();

    setAcademicYears(data);

    const activeYear = data.find(
      (year: AcademicYear) => year.isActive
    );

    if (activeYear) {
      setAcademicYearId(activeYear.id);
    } else if (data.length > 0) {
      setAcademicYearId(data[0].id);
    }
  }

  async function fetchTerms(selectedYearId: string) {
    if (!selectedYearId) {
      setTerms([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/academic-terms?academicYearId=${selectedYearId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch academic terms.");
      }

      const data = await response.json();

      setError("");
      setTerms(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch academic terms."
      );
    } finally {
      setLoadingTerms(false);
    }
  }

  useEffect(() => {
    async function loadAcademicYears() {
      try {
        await fetchAcademicYears();
        setError("");
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load academic years."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAcademicYears();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      // The loader applies state only after the request completes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTerms(academicYearId);
    }
  }, [academicYearId]);

  async function handleSubmit(
    e: React.SubmitEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/academic-terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          academicYearId,
          name,
          order: Number(order),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create academic term."
        );
      }

      setTerms((current) =>
        [...current, data].sort(
          (a, b) => a.order - b.order
        )
      );

      setName("");
      setOrder("");

      setSuccess("Academic term created successfully.");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create academic term."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Academic Terms
        </h1>

        <p className="text-sm text-gray-500">
          Manage the terms used for examinations and
          results.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-medium">
          Academic Year
        </label>

        <select
          value={academicYearId}
          onChange={(e) =>
            setAcademicYearId(e.target.value)
          }
          disabled={loading}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none md:w-1/2"
        >
          <option value="">
            Select academic year
          </option>

          {academicYears.map((year) => (
            <option key={year.id} value={year.id}>
              {year.name}
              {year.isActive ? " (Active)" : ""}
            </option>
          ))}
        </select>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-5 text-lg font-semibold">
          Add Term
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Term Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. First Term"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Order
            </label>

            <input
              type="number"
              min="1"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="e.g. 1"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || !academicYearId}
          className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Term"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold">
            Terms
          </h2>
        </div>

        {loading || loadingTerms ? (
          <div className="p-6 text-sm text-gray-500">
            Loading terms...
          </div>
        ) : terms.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No academic terms have been configured for
            this academic year.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {terms.map((term) => (
              <div
                key={term.id}
                className="flex items-center justify-between p-5"
              >
                <div>
                  <p className="font-medium">
                    {term.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    Order: {term.order}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-medium">
                    {term._count.exams}
                  </p>

                  <p className="text-xs text-gray-500">
                    {term._count.exams === 1
                      ? "Exam"
                      : "Exams"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}