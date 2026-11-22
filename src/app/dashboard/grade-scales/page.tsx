"use client";

import { useEffect, useState } from "react";

type GradeEntry = {
  id?: string;
  minPercentage: string;
  maxPercentage: string;
  grade: string;
  gradePoint: string;
};

type GradeScale = {
  id: string;
  name: string;
  description: string | null;
  entries: GradeEntry[];
};

const emptyEntry: GradeEntry = {
  minPercentage: "",
  maxPercentage: "",
  grade: "",
  gradePoint: "",
};

export default function GradeScalesPage() {
  const [gradeScales, setGradeScales] = useState<GradeScale[]>(
    []
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [entries, setEntries] = useState<GradeEntry[]>([
    { ...emptyEntry },
  ]);

  const [editingId, setEditingId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function fetchGradeScales() {
    try {
      const response = await fetch("/api/grade-scales");

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.error || "Failed to fetch grade scales."
        );
      }

      const data = await response.json();

      setError("");
      setGradeScales(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch grade scales."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The loader applies state only after the request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGradeScales();
  }, []);

  function addEntry() {
    setEntries((current) => [
      ...current,
      { ...emptyEntry },
    ]);
  }

  function removeEntry(index: number) {
    setEntries((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function updateEntry(
    index: number,
    field: keyof GradeEntry,
    value: string
  ) {
    setEntries((current) =>
      current.map((entry, i) =>
        i === index
          ? {
              ...entry,
              [field]: value,
            }
          : entry
      )
    );
  }

  function resetForm() {
    setName("");
    setDescription("");
    setEntries([{ ...emptyEntry }]);
    setEditingId(null);
  }

  function validateEntries() {
    if (entries.length === 0) {
      return "Add at least one grade entry.";
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      const min = Number(entry.minPercentage);
      const max = Number(entry.maxPercentage);
      const gradePoint = Number(entry.gradePoint);

      if (
        !entry.grade.trim() ||
        !Number.isFinite(min) ||
        !Number.isFinite(max) ||
        !Number.isFinite(gradePoint)
      ) {
        return `Please complete grade entry ${i + 1}.`;
      }

      if (min < 0 || min > 100) {
        return `Minimum percentage in row ${
          i + 1
        } must be between 0 and 100.`;
      }

      if (max < 0 || max > 100) {
        return `Maximum percentage in row ${
          i + 1
        } must be between 0 and 100.`;
      }

      if (min > max) {
        return `Minimum percentage cannot exceed maximum percentage in row ${
          i + 1
        }.`;
      }

      if (gradePoint < 0) {
        return `Grade point cannot be negative in row ${
          i + 1
        }.`;
      }
    }

    return null;
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!name.trim()) {
        throw new Error("Grade scale name is required.");
      }

      const validationError = validateEntries();

      if (validationError) {
        throw new Error(validationError);
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        entries: entries.map((entry) => ({
          minPercentage: Number(entry.minPercentage),
          maxPercentage: Number(entry.maxPercentage),
          grade: entry.grade.trim(),
          gradePoint: Number(entry.gradePoint),
        })),
      };

      const url = editingId
        ? `/api/grade-scales/${editingId}`
        : "/api/grade-scales";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save grade scale."
        );
      }

      setSuccess(
        editingId
          ? "Grade scale updated successfully."
          : "Grade scale created successfully."
      );

      resetForm();

      await fetchGradeScales();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save grade scale."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(scale: GradeScale) {
    setEditingId(scale.id);
    setName(scale.name);
    setDescription(scale.description || "");

    setEntries(
      scale.entries.map((entry) => ({
        id: entry.id,
        minPercentage: String(entry.minPercentage),
        maxPercentage: String(entry.maxPercentage),
        grade: entry.grade,
        gradePoint: String(entry.gradePoint),
      }))
    );

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this grade scale?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/grade-scales/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete grade scale."
        );
      }

      setSuccess("Grade scale deleted successfully.");

      if (editingId === id) {
        resetForm();
      }

      await fetchGradeScales();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete grade scale."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Grade Scales
        </h1>

        <p className="text-sm text-gray-500">
          Configure percentage ranges, grades, and grade
          points used for student results.
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

      {/* FORM */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {editingId
                ? "Edit Grade Scale"
                : "Create Grade Scale"}
            </h2>

            <p className="text-sm text-gray-500">
              Define the grading ranges used by the school.
            </p>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Scale Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Example: School Grading Scale"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Description
            </label>

            <input
              type="text"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              placeholder="Optional description"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">
              Grade Entries
            </h3>

            <button
              type="button"
              onClick={addEntry}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              + Add Grade
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-175 text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-3 py-3">
                    Min %
                  </th>

                  <th className="px-3 py-3">
                    Max %
                  </th>

                  <th className="px-3 py-3">
                    Grade
                  </th>

                  <th className="px-3 py-3">
                    Grade Point
                  </th>

                  <th className="px-3 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={entry.minPercentage}
                        onChange={(e) =>
                          updateEntry(
                            index,
                            "minPercentage",
                            e.target.value
                          )
                        }
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 outline-none"
                        placeholder="90"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={entry.maxPercentage}
                        onChange={(e) =>
                          updateEntry(
                            index,
                            "maxPercentage",
                            e.target.value
                          )
                        }
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 outline-none"
                        placeholder="100"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={entry.grade}
                        onChange={(e) =>
                          updateEntry(
                            index,
                            "grade",
                            e.target.value
                          )
                        }
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 outline-none"
                        placeholder="A+"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={entry.gradePoint}
                        onChange={(e) =>
                          updateEntry(
                            index,
                            "gradePoint",
                            e.target.value
                          )
                        }
                        className="w-28 rounded-lg border border-gray-200 px-3 py-2 outline-none"
                        placeholder="4.0"
                      />
                    </td>

                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          removeEntry(index)
                        }
                        disabled={entries.length === 1}
                        className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Grade Scale"
                : "Create Grade Scale"}
          </button>
        </div>
      </div>

      {/* EXISTING SCALES */}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="text-lg font-semibold">
            Existing Grade Scales
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading grade scales...
          </div>
        ) : gradeScales.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No grade scales have been created yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {gradeScales.map((scale) => (
              <div key={scale.id} className="p-5">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="font-semibold">
                      {scale.name}
                    </h3>

                    {scale.description && (
                      <p className="text-sm text-gray-500">
                        {scale.description}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(scale)
                      }
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(scale.id)
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-125 text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left">
                        <th className="px-3 py-2">
                          Percentage
                        </th>

                        <th className="px-3 py-2">
                          Grade
                        </th>

                        <th className="px-3 py-2">
                          Grade Point
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {scale.entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-100"
                        >
                          <td className="px-3 py-2">
                            {entry.minPercentage} –{" "}
                            {entry.maxPercentage}%
                          </td>

                          <td className="px-3 py-2 font-medium">
                            {entry.grade}
                          </td>

                          <td className="px-3 py-2">
                            {entry.gradePoint}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}