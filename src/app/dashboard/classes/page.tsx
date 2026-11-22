"use client";

import { useEffect, useState } from "react";

type SchoolClass = {
  id: string;
  name: string;
  order: number;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchClasses() {
    try {
      const response = await fetch("/api/classes");

      if (!response.ok) {
        throw new Error("Failed to fetch classes.");
      }

      const data = await response.json();
      setError("");
      setClasses(data);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch classes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // The loader applies state only after the request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClasses();
  }, []);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/classes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          order: Number(order),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create class.");
      }

      setClasses((current) => [...current, data].sort((a, b) => a.order - b.order));

      setName("");
      setOrder("");
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create class."
      );
    } finally {
      setSaving(false);
    }
  }
async function handleUpdate() {
  if (!editingClass) return;

  try {
    setSaving(true);
    setError("");

    const response = await fetch(`/api/classes/${editingClass.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: editingClass.name,
        order: editingClass.order,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to update class.");
    }

    setClasses((current) =>
      current
        .map((item) => (item.id === data.id ? data : item))
        .sort((a, b) => a.order - b.order)
    );

    setEditingClass(null);
  } catch (error) {
    console.error(error);
    setError(
      error instanceof Error
        ? error.message
        : "Failed to update class."
    );
  } finally {
    setSaving(false);
  }
}

async function handleDelete(id: string) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this class?"
  );

  if (!confirmed) return;

  try {
    setDeletingId(id);
    setError("");

    const response = await fetch(`/api/classes/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete class.");
    }

    setClasses((current) => current.filter((item) => item.id !== id));
  } catch (error) {
    console.error(error);
    setError(
      error instanceof Error
        ? error.message
        : "Failed to delete class."
    );
  } finally {
    setDeletingId(null);
  }
}
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Classes</h1>
        <p className="text-sm text-gray-500">
          Manage the classes offered by your school.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-(--border) bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-lg font-semibold">Add Class</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Class Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grade 1"
              required
              className="w-full rounded-lg border border-(--border) px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Display Order
            </label>

            <input
              type="number"
              min="1"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="e.g. 5"
              required
              className="w-full rounded-lg border border-(--border) px-3 py-2 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-(--primary) px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Class"}
        </button>
      </form>

      {editingClass && (
  <div className="rounded-xl border border-(--border) bg-white p-6 shadow-sm">
    <h2 className="mb-4 text-lg font-semibold">Edit Class</h2>

    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium">
          Class Name
        </label>

        <input
          type="text"
          value={editingClass.name}
          onChange={(e) =>
            setEditingClass({
              ...editingClass,
              name: e.target.value,
            })
          }
          className="w-full rounded-lg border border-(--border) px-3 py-2 outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Display Order
        </label>

        <input
          type="number"
          min="1"
          value={editingClass.order}
          onChange={(e) =>
            setEditingClass({
              ...editingClass,
              order: Number(e.target.value),
            })
          }
          className="w-full rounded-lg border border-(--border) px-3 py-2 outline-none"
        />
      </div>
    </div>

    <div className="mt-4 flex gap-2">
      <button
        type="button"
        onClick={handleUpdate}
        disabled={saving}
        className="rounded-lg bg-(--primary) px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>

      <button
        type="button"
        onClick={() => setEditingClass(null)}
        className="rounded-lg border border-(--border) px-5 py-2 text-sm font-medium"
      >
        Cancel
      </button>
    </div>
  </div>
)}

      <div className="rounded-xl border border-(--border) bg-white shadow-sm">
        <div className="border-b border-(--border) p-5">
          <h2 className="font-semibold">Classes</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading classes...
          </div>
        ) : classes.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No classes have been configured yet.
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {classes.map((schoolClass) => (
              <div
  key={schoolClass.id}
  className="flex items-center justify-between gap-4 p-5"
>
  <div>
    <p className="font-medium">{schoolClass.name}</p>
    <p className="text-sm text-gray-500">
      Order: {schoolClass.order}
    </p>
  </div>

  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={() => setEditingClass({ ...schoolClass })}
      className="rounded-lg border border-(--border) px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
    >
      Edit
    </button>

    <button
      type="button"
      onClick={() => handleDelete(schoolClass.id)}
      disabled={deletingId === schoolClass.id}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {deletingId === schoolClass.id ? "Deleting..." : "Delete"}
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