"use client";

import { useEffect, useState } from "react";
import { BikramDatePicker } from "@inicrea/bikram-sambat-react";
import "@inicrea/bikram-sambat-react/styles.css";
import {
  adDateToBSInput,
  bsInputToADDate,
  formatBSDate,
} from "@/lib/nepali-date";

type AcademicYear = {
  id: string;
  name: string;
  isActive: boolean;
};

type AcademicTerm = {
  id: string;
  name: string;
  order: number;
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
};

type ClassSubject = {
  id: string;
  subjectId: string;
  subject: Subject;
};

type ExamSubjectInput = {
  subjectId: string;
  theoryFullMarks: string;
  practicalFullMarks: string;
};

type ExamSubject = {
  id: string;
  subject: Subject;
  theoryFullMarks: number;
  practicalFullMarks: number;
};

type Exam = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isPublished: boolean;
  isLocked: boolean;
  class: SchoolClass;
  term: {
    id: string;
    name: string;
    academicYear: AcademicYear;
  };
  subjects: ExamSubject[];
};

export default function ExamsPage() {
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  const [classes, setClasses] = useState<SchoolClass[]>(
    []
  );

  const [classSubjects, setClassSubjects] = useState<
    ClassSubject[]
  >([]);

  const [exams, setExams] = useState<Exam[]>([]);

  const [academicYearId, setAcademicYearId] = useState("");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedSubjects, setSelectedSubjects] = useState<
    ExamSubjectInput[]
  >([]);

  const [editingExam, setEditingExam] =
    useState<Exam | null>(null);

  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [loadingSubjects, setLoadingSubjects] =
    useState(false);
  const [loadingExams, setLoadingExams] = useState(false);

  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );
  const [publishingId, setPublishingId] = useState<string | null>(
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

  async function fetchTerms(yearId: string) {
    if (!yearId) {
      setTerms([]);
      setTermId("");
      return;
    }

    try {
      const response = await fetch(
        `/api/academic-terms?academicYearId=${yearId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch academic terms.");
      }

      const data = await response.json();

      setError("");
      setTerms(data);

      if (data.length > 0) {
        setTermId(data[0].id);
      } else {
        setTermId("");
      }
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

  async function fetchClassSubjects(
    selectedClassId: string,
    selectedYearId: string
  ) {
    if (!selectedClassId || !selectedYearId) {
      setClassSubjects([]);
      setSelectedSubjects([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/class-subjects?classId=${selectedClassId}&academicYearId=${selectedYearId}`
      );

      if (!response.ok) {
        throw new Error(
          "Failed to fetch class subjects."
        );
      }

      const data = await response.json();

      setError("");
      setClassSubjects(data);
      setSelectedSubjects([]);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch class subjects."
      );
    } finally {
      setLoadingSubjects(false);
    }
  }

  async function fetchExams(
    selectedTermId: string,
    selectedClassId: string
  ) {
    if (!selectedTermId || !selectedClassId) {
      setExams([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/exams?termId=${selectedTermId}&classId=${selectedClassId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch exams.");
      }

      const data = await response.json();

      setError("");
      setExams(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch exams."
      );
    } finally {
      setLoadingExams(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        await Promise.all([
          fetchAcademicYears(),
          fetchClasses(),
        ]);
        setError("");
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load exam data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    if (academicYearId) {
      // The loader applies state only after the request completes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchTerms(academicYearId);
    }
  }, [academicYearId]);

  useEffect(() => {
    if (academicYearId && classId) {
      // The loader applies state only after the request completes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchClassSubjects(classId, academicYearId);
    }
  }, [academicYearId, classId]);

  useEffect(() => {
    if (termId && classId) {
      // The loader applies state only after the request completes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchExams(termId, classId);
    }
  }, [termId, classId]);

  function toggleSubject(subjectId: string) {
    setSelectedSubjects((current) => {
      const exists = current.some(
        (item) => item.subjectId === subjectId
      );

      if (exists) {
        return current.filter(
          (item) => item.subjectId !== subjectId
        );
      }

      return [
        ...current,
        {
          subjectId,
          theoryFullMarks: "",
          practicalFullMarks: "",
        },
      ];
    });
  }

  function updateSubjectMarks(
    subjectId: string,
    field:
      | "theoryFullMarks"
      | "practicalFullMarks",
    value: string
  ) {
    setSelectedSubjects((current) =>
      current.map((item) =>
        item.subjectId === subjectId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  async function handleSubmit(
    e: React.SubmitEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!termId || !classId || !name.trim()) {
      setError(
        "Term, class and exam name are required."
      );
      return;
    }

    if (selectedSubjects.length === 0) {
      setError(
        "Select at least one subject for the exam."
      );
      return;
    }

    for (const item of selectedSubjects) {
      const theory = Number(item.theoryFullMarks);
      const practical = Number(
        item.practicalFullMarks || 0
      );

      if (
        !Number.isFinite(theory) ||
        !Number.isFinite(practical) ||
        theory < 0 ||
        practical < 0 ||
        theory + practical <= 0
      ) {
        setError(
          "Every selected subject must have valid full marks."
        );
        return;
      }
    }

    try {
      setSaving(true);

      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          termId,
          classId,
          name: name.trim(),
          startDate: startDate ? bsInputToADDate(startDate) : null,
          endDate: endDate ? bsInputToADDate(endDate) : null,
          subjects: selectedSubjects.map((item) => ({
            subjectId: item.subjectId,
            theoryFullMarks: Number(
              item.theoryFullMarks
            ),
            practicalFullMarks: Number(
              item.practicalFullMarks || 0
            ),
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create exam."
        );
      }

      setExams((current) => [data, ...current]);

      setName("");
      setStartDate("");
      setEndDate("");
      setSelectedSubjects([]);

      setSuccess("Exam created successfully.");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to create exam."
      );
    } finally {
      setSaving(false);
    }
  }

  function startEditingExam(exam: Exam) {
    setEditingExam(exam);

    setEditName(exam.name);

    setEditStartDate(adDateToBSInput(exam.startDate));

    setEditEndDate(adDateToBSInput(exam.endDate));

    setError("");
    setSuccess("");
  }

  function cancelEditingExam() {
    setEditingExam(null);
    setEditName("");
    setEditStartDate("");
    setEditEndDate("");
  }

  async function handleUpdateExam(
    e: React.SubmitEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!editingExam) {
      return;
    }

    try {
      setUpdating(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/exams/${editingExam.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editName,
            startDate: editStartDate
              ? bsInputToADDate(editStartDate)
              : null,
            endDate: editEndDate
              ? bsInputToADDate(editEndDate)
              : null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update exam."
        );
      }

      setExams((current) =>
        current.map((exam) =>
          exam.id === data.id ? data : exam
        )
      );

      setSuccess("Exam updated successfully.");

      cancelEditingExam();
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to update exam."
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteExam(exam: Exam) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${exam.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(exam.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/exams/${exam.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to delete exam."
        );
      }

      setExams((current) =>
        current.filter(
          (item) => item.id !== exam.id
        )
      );

      if (editingExam?.id === exam.id) {
        cancelEditingExam();
      }

      setSuccess("Exam deleted successfully.");
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to delete exam."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handlePublishExam(exam: Exam) {
    const confirmed = window.confirm(
      `Publish results for "${exam.name}" and lock its marks?`,
    );

    if (!confirmed) return;

    try {
      setPublishingId(exam.id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/exams/${exam.id}/publish`,
        { method: "POST" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to publish exam results.",
        );
      }

      setExams((current) =>
        current.map((item) =>
          item.id === exam.id ? data.exam : item,
        ),
      );
      setSuccess("Results published and marks locked.");
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to publish exam results.",
      );
    } finally {
      setPublishingId(null);
    }
  }

  const selectedClass = classes.find(
    (schoolClass) => schoolClass.id === classId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Exams
        </h1>

        <p className="text-sm text-gray-500">
          Create and manage examinations and
          subject-wise full marks.
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
        <h2 className="mb-5 text-lg font-semibold">
          Exam Details
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(e) =>
                setAcademicYearId(e.target.value)
              }
              disabled={loading}
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
              Term
            </label>

            <select
              value={termId}
              onChange={(e) =>
                setTermId(e.target.value)
              }
              disabled={
                loadingTerms || !academicYearId
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
            >
              <option value="">
                Select term
              </option>

              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.name}
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
              onChange={(e) =>
                setClassId(e.target.value)
              }
              disabled={loading}
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

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-5 text-lg font-semibold">
          Create Exam
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Exam Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="e.g. First Terminal Examination"
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Start Date
            </label>

            <BikramDatePicker
              value={startDate}
              onChange={(value) => setStartDate(value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              End Date
            </label>

            <BikramDatePicker
              value={endDate}
              onChange={(value) => setEndDate(value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 font-medium">
            Subjects
          </h3>

          {loadingSubjects ? (
            <p className="text-sm text-gray-500">
              Loading subjects...
            </p>
          ) : classSubjects.length === 0 ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
              No subjects have been assigned to{" "}
              {selectedClass?.name || "this class"} for
              this academic year.
            </div>
          ) : (
            <div className="space-y-3">
              {classSubjects.map((classSubject) => {
                const selected =
                  selectedSubjects.find(
                    (item) =>
                      item.subjectId ===
                      classSubject.subjectId
                  );

                return (
                  <div
                    key={classSubject.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        onChange={() =>
                          toggleSubject(
                            classSubject.subjectId
                          )
                        }
                        className="h-4 w-4"
                      />

                      <div>
                        <p className="font-medium">
                          {classSubject.subject.name}
                        </p>

                        {classSubject.subject.code && (
                          <p className="text-xs text-gray-500">
                            {classSubject.subject.code}
                          </p>
                        )}
                      </div>
                    </div>

                    {selected && (
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-sm text-gray-600">
                            Theory Full Marks
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              selected.theoryFullMarks
                            }
                            onChange={(e) =>
                              updateSubjectMarks(
                                classSubject.subjectId,
                                "theoryFullMarks",
                                e.target.value
                              )
                            }
                            placeholder="e.g. 40"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm text-gray-600">
                            Practical Full Marks
                          </label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={
                              selected.practicalFullMarks
                            }
                            onChange={(e) =>
                              updateSubjectMarks(
                                classSubject.subjectId,
                                "practicalFullMarks",
                                e.target.value
                              )
                            }
                            placeholder="e.g. 10"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={
            saving ||
            !academicYearId ||
            !termId ||
            !classId
          }
          className="mt-6 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Exam"}
        </button>
      </form>

      {editingExam && (
        <form
          onSubmit={handleUpdateExam}
          className="rounded-xl border border-blue-200 bg-blue-50 p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Edit Exam
              </h2>

              <p className="text-sm text-gray-500">
                Update the exam name and dates.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEditingExam}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Exam Name
              </label>

              <input
                type="text"
                value={editName}
                onChange={(e) =>
                  setEditName(e.target.value)
                }
                required
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Start Date
              </label>

              <BikramDatePicker
                value={editStartDate}
                onChange={(value) =>
                  setEditStartDate(value)
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                End Date
              </label>

              <BikramDatePicker
                value={editEndDate}
                onChange={(value) =>
                  setEditEndDate(value)
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={updating}
            className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {updating
              ? "Saving..."
              : "Save Changes"}
          </button>
        </form>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold">
            Existing Exams
          </h2>
        </div>

        {loadingExams ? (
          <div className="p-6 text-sm text-gray-500">
            Loading exams...
          </div>
        ) : exams.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">
            No exams have been created for this class
            and term.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">
                      {exam.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      {exam.term.name} •{" "}
                      {exam.class.name}
                    </p>

                    {(exam.startDate ||
                      exam.endDate) && (
                      <p className="text-sm text-gray-400">
                        {exam.startDate
                         ? formatBSDate(exam.startDate)
                         : "No start date"}{" "}
                        —{" "}
                        {exam.endDate
                         ? formatBSDate(exam.endDate)
                         : "No end date"}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {exam.subjects.length}{" "}
                      {exam.subjects.length === 1
                        ? "subject"
                        : "subjects"}
                    </span>

                    {exam.isPublished ? (
                      <span className="rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700">
                        Published & locked
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePublishExam(exam)}
                        disabled={publishingId === exam.id}
                        className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 disabled:opacity-50"
                      >
                        {publishingId === exam.id
                          ? "Publishing..."
                          : "Publish & lock"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        startEditingExam(exam)
                      }
                      disabled={exam.isPublished || exam.isLocked}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteExam(exam)
                      }
                      disabled={
                        deletingId === exam.id ||
                        exam.isPublished ||
                        exam.isLocked
                      }
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {deletingId === exam.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {exam.subjects.map(
                    (examSubject) => (
                      <div
                        key={examSubject.id}
                        className="rounded-lg bg-gray-50 p-3"
                      >
                        <p className="text-sm font-medium">
                          {examSubject.subject.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          Theory:{" "}
                          {
                            examSubject.theoryFullMarks
                          }{" "}
                          • Practical:{" "}
                          {
                            examSubject.practicalFullMarks
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}