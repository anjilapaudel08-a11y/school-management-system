"use client";

import { useEffect, useState } from "react";

type AcademicYear = {
  id: string;
  name: string;
};

type AcademicTerm = {
  id: string;
  name: string;
};

type SchoolClass = {
  id: string;
  name: string;
};

type Exam = {
  id: string;
  name: string;
};

type GradeScale = {
  id: string;
  name: string;
};

type SubjectResult = {
  subjectId: string;
  subjectName: string;

  theoryMarks: number;
  practicalMarks: number;

  theoryFullMarks: number;
  practicalFullMarks: number;

  total: number;
  fullMarks: number;
  percentage: number;

  grade: string;
  gradePoint: number;
};

type StudentResult = {
  studentId: string;
  studentName: string;
  rollNumber: number | null;

  subjects: SubjectResult[];

  totalObtained: number;
  totalFullMarks: number;
  overallPercentage: number;

  grade: string;
  gpa: number;
  position: number;
};

type ResultsResponse = {
  exam: {
    id: string;
    name: string;
    className: string;
    termName: string;
    academicYear: string;
  };

  gradeScale: {
    id: string;
    name: string;
  };

  results: StudentResult[];
};

export default function ResultsPage() {
  const [academicYears, setAcademicYears] = useState<
    AcademicYear[]
  >([]);

  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [gradeScales, setGradeScales] = useState<
    GradeScale[]
  >([]);

  const [academicYearId, setAcademicYearId] =
    useState("");

  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [examId, setExamId] = useState("");
  const [gradeScaleId, setGradeScaleId] =
    useState("");

  const [results, setResults] =
    useState<ResultsResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInitialData() {
      try {
        setInitialLoading(true);
        setError("");

        const [
          academicYearsResponse,
          classesResponse,
          gradeScalesResponse,
        ] = await Promise.all([
          fetch("/api/academic-years"),
          fetch("/api/classes"),
          fetch("/api/grade-scales"),
        ]);

        if (
          !academicYearsResponse.ok ||
          !classesResponse.ok ||
          !gradeScalesResponse.ok
        ) {
          throw new Error(
            "Failed to load required data."
          );
        }

        const academicYearsData =
          await academicYearsResponse.json();

        const classesData =
          await classesResponse.json();

        const gradeScalesData =
          await gradeScalesResponse.json();

        setAcademicYears(
          Array.isArray(academicYearsData)
            ? academicYearsData
            : academicYearsData.academicYears ?? []
        );

        setClasses(
          Array.isArray(classesData)
            ? classesData
            : classesData.classes ?? []
        );

        setGradeScales(
          Array.isArray(gradeScalesData)
            ? gradeScalesData
            : gradeScalesData.gradeScales ?? []
        );
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load data."
        );
      } finally {
        setInitialLoading(false);
      }
    }

    loadInitialData();
  }, []);

  useEffect(() => {
    async function loadTerms() {
      if (!academicYearId) {
        setTerms([]);
        setTermId("");
        return;
      }

      try {
        const response = await fetch(
          `/api/academic-terms?academicYearId=${academicYearId}`
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load academic terms."
          );
        }

        const data = await response.json();

        setTerms(
          Array.isArray(data)
            ? data
            : data.terms ?? []
        );

        setTermId("");
        setExamId("");
        setExams([]);
        setResults(null);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load terms."
        );
      }
    }

    loadTerms();
  }, [academicYearId]);

  useEffect(() => {
    async function loadExams() {
      if (!termId || !classId) {
        setExams([]);
        setExamId("");
        return;
      }

      try {
        const response = await fetch(
          `/api/exams?termId=${termId}&classId=${classId}`
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load exams."
          );
        }

        const data = await response.json();

        setExams(
          Array.isArray(data)
            ? data
            : data.exams ?? []
        );

        setExamId("");
        setResults(null);
      } catch (error) {
        console.error(error);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load exams."
        );
      }
    }

    loadExams();
  }, [termId, classId]);

  async function calculateResults() {
    if (!examId) {
      setError("Please select an exam.");
      return;
    }

    if (!gradeScaleId) {
      setError("Please select a grade scale.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResults(null);

      const response = await fetch(
        `/api/results?examId=${examId}&gradeScaleId=${gradeScaleId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to calculate results."
        );
      }

      setResults(data);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to calculate results."
      );
    } finally {
      setLoading(false);
    }
  }

  function formatNumber(value: number) {
    return Number(value.toFixed(2));
  }

  if (initialLoading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading results module...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-semibold">
          Results
        </h1>

        <p className="text-sm text-gray-500">
          Calculate and view student examination
          results.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* FILTERS */}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold">
          Select Examination
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Academic Year */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(e) =>
                setAcademicYearId(e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-red-500"
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
                </option>
              ))}
            </select>
          </div>

          {/* Term */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Term
            </label>

            <select
              value={termId}
              onChange={(e) =>
                setTermId(e.target.value)
              }
              disabled={!academicYearId}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none disabled:bg-gray-50"
            >
              <option value="">
                Select term
              </option>

              {terms.map((term) => (
                <option
                  key={term.id}
                  value={term.id}
                >
                  {term.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Class
            </label>

            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setExamId("");
                setResults(null);
              }}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-red-500"
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

          {/* Exam */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Exam
            </label>

            <select
              value={examId}
              onChange={(e) => {
                setExamId(e.target.value);
                setResults(null);
              }}
              disabled={!termId || !classId}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none disabled:bg-gray-50"
            >
              <option value="">
                Select exam
              </option>

              {exams.map((exam) => (
                <option
                  key={exam.id}
                  value={exam.id}
                >
                  {exam.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Scale */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Grade Scale
            </label>

            <select
              value={gradeScaleId}
              onChange={(e) =>
                setGradeScaleId(e.target.value)
              }
              className="w-full rounded-lg border border-gray-200 px-3 py-2 outline-none focus:border-red-500"
            >
              <option value="">
                Select scale
              </option>

              {gradeScales.map((scale) => (
                <option
                  key={scale.id}
                  value={scale.id}
                >
                  {scale.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={calculateResults}
            disabled={
              loading ||
              !examId ||
              !gradeScaleId
            }
            className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading
              ? "Calculating..."
              : "Calculate Results"}
          </button>
        </div>
      </div>

      {/* RESULTS */}

      {results && (
        <div className="space-y-6">
          {/* EXAM INFORMATION */}

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs text-gray-500">
                  Academic Year
                </p>

                <p className="font-medium">
                  {results.exam.academicYear}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Term
                </p>

                <p className="font-medium">
                  {results.exam.termName}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Class
                </p>

                <p className="font-medium">
                  {results.exam.className}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Exam
                </p>

                <p className="font-medium">
                  {results.exam.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Grade Scale
                </p>

                <p className="font-medium">
                  {results.gradeScale.name}
                </p>
              </div>
            </div>
          </div>

          {/* STUDENT SUMMARY */}

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-5">
              <h2 className="text-lg font-semibold">
                Student Results
              </h2>

              <p className="text-sm text-gray-500">
                {results.results.length} students
              </p>
            </div>

            {results.results.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No students found for this class and
                academic year.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-250 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3">
                        Roll
                      </th>

                      <th className="px-4 py-3">
                        Student
                      </th>

                      <th className="px-4 py-3">
                        Total
                      </th>

                      <th className="px-4 py-3">
                        Percentage
                      </th>

                      <th className="px-4 py-3">
                        Grade
                      </th>

                      <th className="px-4 py-3">
                        GPA
                      </th>

                      <th className="px-4 py-3">
                        Position
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {results.results.map(
                      (student) => (
                        <tr
                          key={student.studentId}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3">
                            {student.rollNumber ??
                              "-"}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {student.studentName}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              student.totalObtained
                            )}{" "}
                            /{" "}
                            {formatNumber(
                              student.totalFullMarks
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              student.overallPercentage
                            )}
                            %
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {student.grade}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              student.gpa
                            )}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {student.position}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DETAILED RESULTS */}

          {results.results.map((student) => (
            <div
              key={student.studentId}
              className="rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-3 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold">
                    {student.studentName}
                  </h3>

                  <p className="text-sm text-gray-500">
                    Roll No:{" "}
                    {student.rollNumber ?? "-"}
                  </p>
                </div>

                <div className="flex gap-5 text-sm">
                  <div>
                    <span className="text-gray-500">
                      Percentage
                    </span>

                    <p className="font-semibold">
                      {formatNumber(
                        student.overallPercentage
                      )}
                      %
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">
                      GPA
                    </span>

                    <p className="font-semibold">
                      {formatNumber(student.gpa)}
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500">
                      Position
                    </span>

                    <p className="font-semibold">
                      {student.position}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-225 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3">
                        Subject
                      </th>

                      <th className="px-4 py-3">
                        Theory
                      </th>

                      <th className="px-4 py-3">
                        Practical
                      </th>

                      <th className="px-4 py-3">
                        Total
                      </th>

                      <th className="px-4 py-3">
                        Full Marks
                      </th>

                      <th className="px-4 py-3">
                        %
                      </th>

                      <th className="px-4 py-3">
                        Grade
                      </th>

                      <th className="px-4 py-3">
                        GP
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {student.subjects.map(
                      (subject) => (
                        <tr
                          key={subject.subjectId}
                          className="border-b border-gray-100"
                        >
                          <td className="px-4 py-3 font-medium">
                            {subject.subjectName}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              subject.theoryMarks
                            )}{" "}
                            /{" "}
                            {formatNumber(
                              subject.theoryFullMarks
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              subject.practicalMarks
                            )}{" "}
                            /{" "}
                            {formatNumber(
                              subject.practicalFullMarks
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              subject.total
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              subject.fullMarks
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              subject.percentage
                            )}
                            %
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {subject.grade}
                          </td>

                          <td className="px-4 py-3">
                            {formatNumber(
                              subject.gradePoint
                            )}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}