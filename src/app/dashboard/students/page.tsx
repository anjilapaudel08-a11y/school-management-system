
"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";

type AcademicYear = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

type ClassItem = {
  id: string;
  name: string;
};

type Section = {
  id: string;
  name: string;
};

type Enrollment = {
  id: string;
  academicYearId: string;
  classId: string;
  sectionId: string | null;
  rollNumber: number | null;
  academicYear: AcademicYear;
  class: ClassItem;
  section: Section | null;
};

type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  fatherName: string | null;
  motherName: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  photo: string | null;
  enrollments: Enrollment[];
};

type StudentForm = {
  admissionNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  fatherName: string;
  motherName: string;
  guardianName: string;
  guardianPhone: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  rollNumber: string;
};

const emptyForm: StudentForm = {
  admissionNumber: "",
  firstName: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  phone: "",
  email: "",
  fatherName: "",
  motherName: "",
  guardianName: "",
  guardianPhone: "",
  academicYearId: "",
  classId: "",
  sectionId: "",
  rollNumber: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [form, setForm] = useState<StudentForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/students", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load students.");
      }

      setStudents(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load students."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAcademicYears = async () => {
    try {
      const response = await fetch("/api/academic-years", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load academic years.");
      }

      setAcademicYears(data);
    } catch (err) {
      console.error("Failed to load academic years:", err);
    }
  };

  const loadClasses = async () => {
    try {
      const response = await fetch("/api/classes", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load classes.");
      }

      setClasses(data);
    } catch (err) {
      console.error("Failed to load classes:", err);
    }
  };

  const loadSections = async () => {
    try {
      const response = await fetch("/api/sections", {
        cache: "no-store",
      });

      if (!response.ok) {
        setSections([]);
        return;
      }

      const data = await response.json();
      setSections(data);
    } catch {
      setSections([]);
    }
  };

  useEffect(() => {
    loadStudents();
    loadAcademicYears();
    loadClasses();
    loadSections();
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const fullName = [
        student.firstName,
        student.middleName,
        student.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      const latestEnrollment = student.enrollments?.[0];

      const searchableText = [
        fullName,
        student.admissionNumber,
        student.phone,
        student.email,
        latestEnrollment?.class?.name,
        latestEnrollment?.section?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [students, search]);

  const latestEnrollment = (student: Student) => {
    return student.enrollments?.[0] ?? null;
  };

  const studentFullName = (student: Student) => {
    return [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      academicYearId:
        academicYears.find((year) => year.isActive)?.id ||
        academicYears[0]?.id ||
        "",
    });
    setEditingStudent(null);
    setError("");
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (student: Student) => {
    const enrollment = latestEnrollment(student);

    setEditingStudent(student);

    setForm({
      admissionNumber: student.admissionNumber || "",
      firstName: student.firstName || "",
      middleName: student.middleName || "",
      lastName: student.lastName || "",
      dateOfBirth: student.dateOfBirth
        ? student.dateOfBirth.substring(0, 10)
        : "",
      gender: student.gender || "",
      address: student.address || "",
      phone: student.phone || "",
      email: student.email || "",
      fatherName: student.fatherName || "",
      motherName: student.motherName || "",
      guardianName: student.guardianName || "",
      guardianPhone: student.guardianPhone || "",
      academicYearId: enrollment?.academicYearId || "",
      classId: enrollment?.classId || "",
      sectionId: enrollment?.sectionId || "",
      rollNumber:
        enrollment?.rollNumber !== null &&
        enrollment?.rollNumber !== undefined
          ? String(enrollment.rollNumber)
          : "",
    });

    setError("");
    setShowForm(true);
  };

  const handleAcademicYearChange = (academicYearId: string) => {
    setForm((current) => {
      if (!editingStudent) {
        return {
          ...current,
          academicYearId,
          classId: "",
          sectionId: "",
          rollNumber: "",
        };
      }

      const existingEnrollment = editingStudent.enrollments.find(
        (enrollment) => enrollment.academicYearId === academicYearId
      );

      if (existingEnrollment) {
        return {
          ...current,
          academicYearId,
          classId: existingEnrollment.classId,
          sectionId: existingEnrollment.sectionId || "",
          rollNumber:
            existingEnrollment.rollNumber !== null &&
            existingEnrollment.rollNumber !== undefined
              ? String(existingEnrollment.rollNumber)
              : "",
        };
      }

      return {
        ...current,
        academicYearId,
        classId: "",
        sectionId: "",
        rollNumber: "",
      };
    });
  };

  const handleChange = (
    field: keyof StudentForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!form.firstName.trim()) {
        setError("First name is required.");
        return;
      }

      if (!form.academicYearId) {
        setError("Academic year is required.");
        return;
      }

      if (!form.classId) {
        setError("Class is required.");
        return;
      }

      const payload = {
        admissionNumber: form.admissionNumber.trim(),
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        fatherName: form.fatherName.trim() || null,
        motherName: form.motherName.trim() || null,
        guardianName: form.guardianName.trim() || null,
        guardianPhone: form.guardianPhone.trim() || null,
        academicYearId: form.academicYearId,
        classId: form.classId,
        sectionId: form.sectionId || null,
        rollNumber: form.rollNumber
          ? Number(form.rollNumber)
          : null,
      };

      const url = editingStudent
        ? `/api/students/${editingStudent.id}`
        : "/api/students";

      const method = editingStudent ? "PUT" : "POST";

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
          data.error ||
            `Failed to ${editingStudent ? "update" : "create"} student.`
        );
      }

      setSuccess(
        editingStudent
          ? "Student updated successfully."
          : "Student created successfully."
      );

      setShowForm(false);
      setEditingStudent(null);
      setForm(emptyForm);

      await loadStudents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${studentFullName(
        student
      )}? This action cannot be undone if the student has no financial or academic records.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

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

      setSuccess("Student deleted successfully.");
      await loadStudents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete student."
      );
    }
  };

  const goToProfile = (studentId: string) => {
    window.location.href = `/dashboard/students/${studentId}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-(--primary-dark)">
            Students
          </h1>

          <p className="mt-1 text-sm text-(--muted)">
            Manage student information, enrollment and academic history.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-(--primary-dark) px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <p className="text-sm text-(--muted)">Total Students</p>
          <p className="mt-1 text-2xl font-bold text-(--primary-dark)">
            {students.length}
          </p>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <p className="text-sm text-(--muted)">Showing</p>
          <p className="mt-1 text-2xl font-bold text-(--primary-dark)">
            {filteredStudents.length}
          </p>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
          <p className="text-sm text-(--muted)">Academic Years</p>
          <p className="mt-1 text-2xl font-bold text-(--primary-dark)">
            {academicYears.length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-xl border border-(--border) bg-(--surface) p-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-(--muted)"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, admission number, phone, class..."
            className="w-full rounded-lg border border-(--border) bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-(--primary-dark)"
          />
        </div>
      </div>

      {/* Student Table */}
      <div className="overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-(--border) bg-black/5 text-left">
                <th className="px-5 py-4 font-semibold">
                  Admission No.
                </th>

                <th className="px-5 py-4 font-semibold">
                  Student
                </th>

                <th className="px-5 py-4 font-semibold">
                  Class
                </th>

                <th className="px-5 py-4 font-semibold">
                  Section
                </th>

                <th className="px-5 py-4 font-semibold">
                  Roll
                </th>

                <th className="px-5 py-4 font-semibold">
                  Academic Year
                </th>

                <th className="px-5 py-4 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-(--muted)"
                  >
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-(--muted)"
                  >
                    {search
                      ? "No students match your search."
                      : "No students found."}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const enrollment =
                    latestEnrollment(student);

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-(--border) last:border-b-0 hover:bg-black/[0.02]"
                    >
                      <td className="px-5 py-4 font-medium">
                        {student.admissionNumber}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-(--primary-dark)">
                          {studentFullName(student)}
                        </div>

                        {student.phone && (
                          <div className="mt-1 text-xs text-(--muted)">
                            {student.phone}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {enrollment?.class?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {enrollment?.section?.name || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {enrollment?.rollNumber ?? "—"}
                      </td>

                      <td className="px-5 py-4">
                        {enrollment?.academicYear?.name || "—"}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* VIEW */}
                          <button
                            type="button"
                            onClick={() =>
                              goToProfile(student.id)
                            }
                            title="View student profile"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) px-3 py-2 text-xs font-semibold text-(--primary-dark) transition hover:bg-black/5"
                          >
                            <Eye size={15} />
                            View
                          </button>

                          {/* EDIT */}
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(student)
                            }
                            title="Edit student"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) px-3 py-2 text-xs font-semibold text-(--primary-dark) transition hover:bg-black/5"
                          >
                            <Pencil size={15} />
                            Edit
                          </button>

                          {/* DELETE */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(student)
                            }
                            title="Delete student"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Student Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-(--surface) shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-(--border) bg-(--surface) px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-(--primary-dark)">
                  {editingStudent
                    ? "Edit Student"
                    : "Add Student"}
                </h2>

                {editingStudent && (
                  <p className="mt-1 text-xs text-(--muted)">
                    Select an academic year to edit that year's
                    enrollment without changing other years.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingStudent(null);
                  setError("");
                }}
                className="rounded-lg p-2 text-(--muted) hover:bg-black/5"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6"
            >
              {/* Basic Information */}
              <section>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-(--primary-dark)">
                  Student Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field
                    label="Admission Number"
                    value={form.admissionNumber}
                    onChange={(value) =>
                      handleChange(
                        "admissionNumber",
                        value
                      )
                    }
                    placeholder="Auto-generated if empty"
                  />

                  <Field
                    label="First Name"
                    required
                    value={form.firstName}
                    onChange={(value) =>
                      handleChange("firstName", value)
                    }
                  />

                  <Field
                    label="Middle Name"
                    value={form.middleName}
                    onChange={(value) =>
                      handleChange(
                        "middleName",
                        value
                      )
                    }
                  />

                  <Field
                    label="Last Name"
                    value={form.lastName}
                    onChange={(value) =>
                      handleChange("lastName", value)
                    }
                  />

                  <Field
                    label="Date of Birth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(value) =>
                      handleChange(
                        "dateOfBirth",
                        value
                      )
                    }
                  />

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Gender
                    </label>

                    <select
                      value={form.gender}
                      onChange={(event) =>
                        handleChange(
                          "gender",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-(--border) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--primary-dark)"
                    >
                      <option value="">
                        Select gender
                      </option>
                      <option value="Male">
                        Male
                      </option>
                      <option value="Female">
                        Female
                      </option>
                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </div>

                  <Field
                    label="Phone"
                    value={form.phone}
                    onChange={(value) =>
                      handleChange("phone", value)
                    }
                  />

                  <Field
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(value) =>
                      handleChange("email", value)
                    }
                  />

                  <Field
                    label="Address"
                    value={form.address}
                    onChange={(value) =>
                      handleChange(
                        "address",
                        value
                      )
                    }
                  />
                </div>
              </section>

              {/* Parent / Guardian */}
              <section>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-(--primary-dark)">
                  Parent / Guardian Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field
                    label="Father's Name"
                    value={form.fatherName}
                    onChange={(value) =>
                      handleChange(
                        "fatherName",
                        value
                      )
                    }
                  />

                  <Field
                    label="Mother's Name"
                    value={form.motherName}
                    onChange={(value) =>
                      handleChange(
                        "motherName",
                        value
                      )
                    }
                  />

                  <Field
                    label="Guardian Name"
                    value={form.guardianName}
                    onChange={(value) =>
                      handleChange(
                        "guardianName",
                        value
                      )
                    }
                  />

                  <Field
                    label="Guardian Phone"
                    value={form.guardianPhone}
                    onChange={(value) =>
                      handleChange(
                        "guardianPhone",
                        value
                      )
                    }
                  />
                </div>
              </section>

              {/* Enrollment */}
              <section>
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-(--primary-dark)">
                  Enrollment
                </h3>

                {editingStudent &&
                  editingStudent.enrollments.length > 0 && (
                    <div className="mb-4 rounded-lg border border-(--border) bg-black/[0.02] p-3">
                      <p className="text-xs font-semibold text-(--primary-dark)">
                        Existing Academic History
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {editingStudent.enrollments.map(
                          (enrollment) => (
                            <span
                              key={enrollment.id}
                              className="rounded-full border border-(--border) bg-white px-3 py-1 text-xs"
                            >
                              {enrollment.academicYear.name}
                              {" — "}
                              {enrollment.class.name}
                              {enrollment.section
                                ? ` — ${enrollment.section.name}`
                                : ""}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Academic Year
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      value={form.academicYearId}
                      onChange={(event) =>
                        handleAcademicYearChange(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-(--border) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--primary-dark)"
                      required
                    >
                      <option value="">
                        Select year
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
                    <label className="mb-1.5 block text-sm font-medium">
                      Class
                      <span className="ml-1 text-red-500">
                        *
                      </span>
                    </label>

                    <select
                      value={form.classId}
                      onChange={(event) =>
                        handleChange(
                          "classId",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-(--border) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--primary-dark)"
                      required
                    >
                      <option value="">
                        Select class
                      </option>

                      {classes.map((item) => (
                        <option
                          key={item.id}
                          value={item.id}
                        >
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Section
                    </label>

                    <select
                      value={form.sectionId}
                      onChange={(event) =>
                        handleChange(
                          "sectionId",
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-(--border) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--primary-dark)"
                    >
                      <option value="">
                        No section
                      </option>

                      {sections.map((section) => (
                        <option
                          key={section.id}
                          value={section.id}
                        >
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Field
                    label="Roll Number"
                    type="number"
                    value={form.rollNumber}
                    onChange={(value) =>
                      handleChange(
                        "rollNumber",
                        value
                      )
                    }
                  />
                </div>
              </section>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-(--border) pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingStudent(null);
                    setError("");
                  }}
                  className="rounded-lg border border-(--border) px-4 py-2.5 text-sm font-semibold hover:bg-black/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-(--primary-dark) px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingStudent
                    ? "Update Student"
                    : "Create Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-(--border) bg-white px-3 py-2.5 text-sm outline-none focus:border-(--primary-dark)"
      />
    </div>
  );
}
