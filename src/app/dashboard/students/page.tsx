"use client";

import { useEffect, useState } from "react";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type SchoolClass = {
  id: string;
  name: string;
  order: number;
};

type Enrollment = {
  id: string;
  rollNumber: number | null;
  academicYear: AcademicYear;
  class: SchoolClass;
};

type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  enrollments: Enrollment[];
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [rollNumber, setRollNumber] = useState("");

  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  const [editingStudentId, setEditingStudentId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function fetchStudents() {
    const response = await fetch("/api/students");

    if (!response.ok) {
      throw new Error("Failed to fetch students.");
    }

    const data = await response.json();
    setStudents(data);
  }

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

    if (activeYear && !editingStudentId) {
      setAcademicYearId(activeYear.id);
    }
  }

  async function fetchClasses() {
    const response = await fetch("/api/classes");

    if (!response.ok) {
      throw new Error("Failed to fetch classes.");
    }

    const data = await response.json();
    setClasses(data);
  }

  useEffect(() => {
    async function loadData() {
      try {
        setError("");

        await Promise.all([
          fetchStudents(),
          fetchAcademicYears(),
          fetchClasses(),
        ]);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load student data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function resetForm() {
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setDateOfBirth("");
    setGender("");
    setPhone("");
    setRollNumber("");
    setFatherName("");
    setMotherName("");
    setGuardianName("");
    setGuardianPhone("");
    setEditingStudentId(null);
  }

  function handleEdit(student: Student) {
    const enrollment = student.enrollments[0];

    setEditingStudentId(student.id);

    setFirstName(student.firstName);
    setMiddleName(student.middleName || "");
    setLastName(student.lastName || "");

    if (student.dateOfBirth) {
      setDateOfBirth(student.dateOfBirth.split("T")[0]);
    } else {
      setDateOfBirth("");
    }

    setGender(student.gender || "");
    setPhone(student.phone || "");

    if (enrollment) {
      setAcademicYearId(enrollment.academicYear.id);
      setClassId(enrollment.class.id);
      setRollNumber(
        enrollment.rollNumber !== null
          ? String(enrollment.rollNumber)
          : ""
      );
    }

    setFatherName(student.fatherName || "");
    setMotherName(student.motherName || "");
    setGuardianName(student.guardianName || "");
    setGuardianPhone(student.guardianPhone || "");

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

      const isEditing = editingStudentId !== null;

      const response = await fetch(
        isEditing
          ? `/api/students/${editingStudentId}`
          : "/api/students",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            middleName,
            lastName,
            dateOfBirth: dateOfBirth || null,
            gender,
            phone,
            academicYearId,
            classId,
            rollNumber: rollNumber || null,
            fatherName,
            motherName,
            guardianName,
            guardianPhone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            (isEditing
              ? "Failed to update student."
              : "Failed to create student.")
        );
      }

      if (isEditing) {
        setStudents((current) =>
          current.map((student) =>
            student.id === data.id ? data : student
          )
        );
      } else {
        setStudents((current) => [data, ...current]);
      }

      resetForm();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to save student."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(student: Student) {
    const fullName = [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const confirmed = window.confirm(
      `Are you sure you want to delete ${fullName}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(student.id);
      setError("");

      const response = await fetch(
        `/api/students/${student.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete student."
        );
      }

      setStudents((current) =>
        current.filter((item) => item.id !== student.id)
      );

      if (editingStudentId === student.id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete student."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Students</h1>

        <p className="text-sm text-gray-500">
          Register and manage students in your school.
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
            {editingStudentId ? "Edit Student" : "Add Student"}
          </h2>

          {editingStudentId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-900"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              First Name
            </label>

            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="e.g. Ram"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Middle Name
            </label>

            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Last Name
            </label>

            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Sharma"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Date of Birth
            </label>

            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Gender
            </label>

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Phone
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>
        </div>

        <div className="my-6 border-t border-gray-200" />

        <h3 className="mb-4 text-base font-semibold">
          Enrollment
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
            >
              <option value="">Select academic year</option>

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
              required
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
            >
              <option value="">Select class</option>

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
              Roll Number
            </label>

            <input
              type="number"
              min="1"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>
        </div>

        <div className="my-6 border-t border-gray-200" />

        <h3 className="mb-4 text-base font-semibold">
          Parent / Guardian Details
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Father Name
            </label>

            <input
              type="text"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Mother Name
            </label>

            <input
              type="text"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Guardian Name
            </label>

            <input
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Guardian Phone
            </label>

            <input
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingStudentId
                ? "Save Changes"
                : "Add Student"}
          </button>

          {editingStudentId && (
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
          <h2 className="font-semibold">Students</h2>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">
            Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No students have been registered yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {students.map((student) => {
              const enrollment = student.enrollments[0];

              const fullName = [
                student.firstName,
                student.middleName,
                student.lastName,
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={student.id}
                  className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{fullName}</p>

                    <p className="text-sm text-gray-500">
                      {student.admissionNumber}
                      {enrollment
                        ? ` • ${enrollment.class.name}`
                        : ""}
                    </p>

                    {enrollment?.academicYear && (
                      <p className="mt-1 text-xs text-gray-400">
                        {enrollment.academicYear.name}
                        {enrollment.rollNumber
                          ? ` • Roll No. ${enrollment.rollNumber}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(student)}
                      disabled={deletingId === student.id}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(student)}
                      disabled={deletingId === student.id}
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === student.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}