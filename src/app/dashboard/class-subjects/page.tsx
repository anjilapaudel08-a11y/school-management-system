"use client";

import { useEffect, useState } from "react";

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

type Subject = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
};

type ClassSubject = {
  id: string;
  subject: Subject;
};

export default function ClassSubjectsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
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

  async function fetchClasses() {
    const response = await fetch("/api/classes");

    if (!response.ok) {
      throw new Error("Failed to fetch classes.");
    }

    const data = await response.json();

    setClasses(data);

    if (data.length > 0) {
      setClassId(data[0].id);
    }
  }

  async function fetchSubjects() {
    const response = await fetch("/api/subjects");

    if (!response.ok) {
      throw new Error("Failed to fetch subjects.");
    }

    const data = await response.json();

    setSubjects(data);
  }

  async function fetchAssignedSubjects(
    selectedClassId: string,
    selectedAcademicYearId: string
  ) {
    if (!selectedClassId || !selectedAcademicYearId) {
      setAssignedSubjects([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/class-subjects?classId=${selectedClassId}&academicYearId=${selectedAcademicYearId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch assigned subjects.");
      }

      const data: ClassSubject[] = await response.json();

      setError("");
      setSuccess("");
      setAssignedSubjects(
        data.map((item) => item.subject.id)
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch assigned subjects."
      );
    } finally {
      setLoadingAssignments(false);
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        await Promise.all([
          fetchAcademicYears(),
          fetchClasses(),
          fetchSubjects(),
        ]);
        setError("");
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (classId && academicYearId) {
      // The loader applies state only after the request completes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAssignedSubjects(classId, academicYearId);
    }
  }, [classId, academicYearId]);

  function toggleSubject(subjectId: string) {
    setAssignedSubjects((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }

      return [...current, subjectId];
    });

    setSuccess("");
  }

  function selectAll() {
    setAssignedSubjects(subjects.map((subject) => subject.id));
    setSuccess("");
  }

  function clearAll() {
    setAssignedSubjects([]);
    setSuccess("");
  }

  async function handleSave() {
    if (!academicYearId || !classId) {
      setError("Please select an academic year and class.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/class-subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId,
          academicYearId,
          subjectIds: assignedSubjects,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to save class subjects."
        );
      }

      setAssignedSubjects(
        data.map((item: ClassSubject) => item.subject.id)
      );

      setSuccess("Subjects saved successfully.");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save class subjects."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Class Subjects
        </h1>

        <p className="text-sm text-gray-500">
          Assign subjects to each class for an academic year.
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
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(e) =>
                setAcademicYearId(e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
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

          <div>
            <label className="mb-1 block text-sm font-medium">
              Class
            </label>

            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
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
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">
              Available Subjects
            </h2>

            <p className="text-sm text-gray-500">
              {assignedSubjects.length} of {subjects.length}{" "}
              subjects selected
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              disabled={subjects.length === 0}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Select All
            </button>

            <button
              type="button"
              onClick={clearAll}
              disabled={subjects.length === 0}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>
        </div>

        {loading || loadingAssignments ? (
          <div className="p-6 text-sm text-gray-500">
            Loading subjects...
          </div>
        ) : subjects.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No subjects have been created yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subjects.map((subject) => {
              const selected = assignedSubjects.includes(
                subject.id
              );

              return (
                <label
                  key={subject.id}
                  className="flex cursor-pointer items-center gap-4 p-5 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      toggleSubject(subject.id)
                    }
                    className="h-4 w-4"
                  />

                  <div>
                    <p className="font-medium">
                      {subject.name}
                    </p>

                    {subject.code && (
                      <p className="text-sm text-gray-500">
                        {subject.code}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <div className="border-t border-gray-200 p-5">
          <button
            type="button"
            onClick={handleSave}
            disabled={
              saving ||
              loading ||
              loadingAssignments ||
              !classId ||
              !academicYearId
            }
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Subjects"}
          </button>
        </div>
      </div>
    </div>
  );
}