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

type Teacher = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
};

type Subject = {
  id: string;
  name: string;
  code: string | null;
};

type TeacherAssignment = {
  id: string;
  teacher: Teacher;
  class: SchoolClass;
  subject: Subject;
  academicYear: AcademicYear;
};

export default function TeacherAssignmentsPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<
    TeacherAssignment[]
  >([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] =
    useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

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

  async function fetchTeachers() {
    const response = await fetch("/api/teachers");

    if (!response.ok) {
      throw new Error("Failed to fetch teachers.");
    }

    const data = await response.json();

    setTeachers(data);
  }

  async function fetchSubjects() {
    const response = await fetch("/api/subjects");

    if (!response.ok) {
      throw new Error("Failed to fetch subjects.");
    }

    const data = await response.json();

    setSubjects(data);
  }

  async function fetchAssignments(
    selectedAcademicYearId: string,
    selectedClassId: string
  ) {
    if (!selectedAcademicYearId || !selectedClassId) {
      setAssignments([]);
      return;
    }

    try {
      setLoadingAssignments(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/teacher-assignments?academicYearId=${selectedAcademicYearId}&classId=${selectedClassId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch teacher assignments."
        );
      }

      const data = await response.json();

      setAssignments(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch teacher assignments."
      );
    } finally {
      setLoadingAssignments(false);
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        setError("");

        await Promise.all([
          fetchAcademicYears(),
          fetchClasses(),
          fetchTeachers(),
          fetchSubjects(),
        ]);
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
    if (academicYearId && classId) {
      fetchAssignments(academicYearId, classId);
    }
  }, [academicYearId, classId]);

  function getTeacherName(teacher: Teacher) {
    return [
      teacher.firstName,
      teacher.middleName,
      teacher.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function handleSubmit(
    e: React.SubmitEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (
      !academicYearId ||
      !classId ||
      !teacherId ||
      !subjectId
    ) {
      setError("Please complete all fields.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        "/api/teacher-assignments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            academicYearId,
            classId,
            teacherId,
            subjectId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create teacher assignment."
        );
      }

      setAssignments((current) =>
        [...current, data].sort((a, b) =>
          a.subject.name.localeCompare(b.subject.name)
        )
      );

      setTeacherId("");
      setSubjectId("");

      setSuccess("Teacher assignment added successfully.");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create teacher assignment."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    assignment: TeacherAssignment
  ) {
    const teacherName = getTeacherName(assignment.teacher);

    const confirmed = window.confirm(
      `Remove ${teacherName} from ${assignment.subject.name}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(assignment.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/teacher-assignments/${assignment.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete teacher assignment."
        );
      }

      setAssignments((current) =>
        current.filter(
          (item) => item.id !== assignment.id
        )
      );

      setSuccess("Teacher assignment removed.");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete teacher assignment."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Teacher Assignments
        </h1>

        <p className="text-sm text-gray-500">
          Assign teachers to subjects and classes for an
          academic year.
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

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-5 text-lg font-semibold">
          Add Assignment
        </h2>

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

          <div>
            <label className="mb-1 block text-sm font-medium">
              Subject
            </label>

            <select
              value={subjectId}
              onChange={(e) =>
                setSubjectId(e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
            >
              <option value="">
                Select subject
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.name}
                  {subject.code
                    ? ` (${subject.code})`
                    : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Teacher
            </label>

            <select
              value={teacherId}
              onChange={(e) =>
                setTeacherId(e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
            >
              <option value="">
                Select teacher
              </option>

              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {getTeacherName(teacher)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Assigning..." : "Assign Teacher"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold">
            Current Assignments
          </h2>

          {classId && (
            <p className="mt-1 text-sm text-gray-500">
              {
                classes.find(
                  (schoolClass) =>
                    schoolClass.id === classId
                )?.name
              }
            </p>
          )}
        </div>

        {loading || loadingAssignments ? (
          <div className="p-6 text-sm text-gray-500">
            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No teacher assignments have been configured
            for this class.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {assignment.subject.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    Teacher:{" "}
                    {getTeacherName(assignment.teacher)}
                  </p>

                  {assignment.subject.code && (
                    <p className="text-sm text-gray-400">
                      Code: {assignment.subject.code}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleDelete(assignment)
                  }
                  disabled={
                    deletingId === assignment.id
                  }
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deletingId === assignment.id
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}