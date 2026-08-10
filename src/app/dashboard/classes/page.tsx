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

  async function fetchClasses() {
    try {
      setError("");

      const response = await fetch("/api/classes");

      if (!response.ok) {
        throw new Error("Failed to fetch classes.");
      }

      const data = await response.json();
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
        className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm"
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
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 outline-none"
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
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add Class"}
        </button>
      </form>

      <div className="rounded-xl border border-[var(--border)] bg-white shadow-sm">
        <div className="border-b border-[var(--border)] p-5">
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
          <div className="divide-y divide-[var(--border)]">
            {classes.map((schoolClass) => (
              <div
                key={schoolClass.id}
                className="flex items-center justify-between p-5"
              >
                <div>
                  <p className="font-medium">{schoolClass.name}</p>
                  <p className="text-sm text-gray-500">
                    Order: {schoolClass.order}
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