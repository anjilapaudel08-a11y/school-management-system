"use client";

import { useEffect, useState } from "react";

type Subject = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchSubjects() {
    const response = await fetch("/api/subjects");

    if (!response.ok) {
      throw new Error("Failed to fetch subjects.");
    }

    const data = await response.json();
    setSubjects(data);
  }

  useEffect(() => {
    async function loadSubjects() {
      try {
        setError("");
        await fetchSubjects();
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load subjects."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSubjects();
  }, []);

  function resetForm() {
    setName("");
    setCode("");
    setDescription("");
    setEditingSubjectId(null);
  }

  function handleEdit(subject: Subject) {
    setEditingSubjectId(subject.id);
    setName(subject.name);
    setCode(subject.code || "");
    setDescription(subject.description || "");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(
    e: React.SubmitEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const isEditing = editingSubjectId !== null;

      const response = await fetch(
        isEditing
          ? `/api/subjects/${editingSubjectId}`
          : "/api/subjects",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            code,
            description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (isEditing
              ? "Failed to update subject."
              : "Failed to create subject.")
        );
      }

      if (isEditing) {
        setSubjects((current) =>
          current
            .map((subject) =>
              subject.id === data.id ? data : subject
            )
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      } else {
        setSubjects((current) =>
          [...current, data].sort((a, b) =>
            a.name.localeCompare(b.name)
          )
        );
      }

      resetForm();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save subject."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(subject: Subject) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${subject.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(subject.id);
      setError("");

      const response = await fetch(
        `/api/subjects/${subject.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete subject."
        );
      }

      setSubjects((current) =>
        current.filter((item) => item.id !== subject.id)
      );

      if (editingSubjectId === subject.id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete subject."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Subjects</h1>

        <p className="text-sm text-gray-500">
          Create and manage the subjects offered by the school.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            {editingSubjectId ? "Edit Subject" : "Add Subject"}
          </h2>

          {editingSubjectId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Subject Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Mathematics"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Subject Code
            </label>

            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium">
            Description
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
          />
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingSubjectId
                ? "Save Changes"
                : "Add Subject"}
          </button>

          {editingSubjectId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold">Subjects</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading subjects...
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No subjects have been configured yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{subject.name}</p>

                  {subject.code && (
                    <p className="text-sm text-gray-500">
                      Code: {subject.code}
                    </p>
                  )}

                  {subject.description && (
                    <p className="mt-1 text-sm text-gray-400">
                      {subject.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(subject)}
                    disabled={deletingId === subject.id}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(subject)}
                    disabled={deletingId === subject.id}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === subject.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}