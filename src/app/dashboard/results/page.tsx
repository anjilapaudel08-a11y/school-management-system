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

type ClassItem = {
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
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [gradeScales, setGradeScales] = useState<GradeScale[]>(
    []
  );

  const [academicYearId, setAcademicYearId] =
    useState("");

  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [examId, setExamId] = useState("");
  const [gradeScaleId, setGradeScaleId] = useState("");

  const [results, setResults] =
    useState<ResultsResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] =
    useState(true);

  const [error, setError] = useState("");

  // --------------------------------------------------
  // LOAD INITIAL DATA
  // --------------------------------------------------

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

        const academicYearsData =
          await academicYearsResponse.json();

        const classesData =
          await classesResponse.json();

        const gradeScalesData =
          await gradeScalesResponse.json();

        if (!academicYearsResponse.ok) {
          throw new Error(
            academicYearsData.error ||
              "Failed to load academic years."
          );
        }

        if (!classesResponse.ok) {
          throw new Error(
            classesData.error ||
              "Failed to load classes."
          );
        }

        if (!gradeScalesResponse.ok) {
          throw new Error(
            gradeScalesData.error ||
              "Failed to load grade scales."
          );
        }

        setAcademicYears(
          Array.isArray(academicYearsData)
            ? academicYearsData
            : academicYearsData.academicYears || []
        );

        setClasses(
          Array.isArray(classesData)
            ? classesData
            : classesData.classes || []
        );

        setGradeScales(
          Array.isArray(gradeScalesData)
            ? gradeScalesData
            : gradeScalesData.gradeScales || []
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load initial data."
        );
      } finally {
        setInitialLoading(false);
      }
    }

    loadInitialData();
  }, []);

  // --------------------------------------------------
  // LOAD TERMS WHEN ACADEMIC YEAR CHANGES
  // --------------------------------------------------

  useEffect(() => {
    async function loadTerms() {
      if (!academicYearId) {
        setTerms([]);
        setTermId("");
        return;
      }

      try {
        setError("");

        const response = await fetch(
          `/api/academic-terms?academicYearId=${academicYearId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load academic terms."
          );
        }

        setTerms(
          Array.isArray(data)
            ? data
            : data.terms || []
        );

        setTermId("");
        setExamId("");
        setExams([]);
        setResults(null);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load academic terms."
        );
      }
    }

    loadTerms();
  }, [academicYearId]);

  // --------------------------------------------------
  // LOAD EXAMS WHEN TERM + CLASS CHANGE
  // --------------------------------------------------

  useEffect(() => {
    async function loadExams() {
      if (!termId || !classId) {
        setExams([]);
        setExamId("");
        return;
      }

      try {
        setError("");

        const response = await fetch(
          `/api/exams?termId=${termId}&classId=${classId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load exams."
          );
        }

        setExams(
          Array.isArray(data)
            ? data
            : data.exams || []
        );

        setExamId("");
        setResults(null);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load exams."
        );
      }
    }

    loadExams();
  }, [termId, classId]);

  // --------------------------------------------------
  // CLEAR RESULTS WHEN CLASS CHANGES
  // --------------------------------------------------

  useEffect(() => {
    setResults(null);
    setExamId("");
  }, [classId]);

  // --------------------------------------------------
  // CALCULATE RESULTS
  // --------------------------------------------------

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

      const response = await fetch(
        `/api/results?examId=${examId}&gradeScaleId=${gradeScaleId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to calculate results."
        );
      }

      setResults(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to calculate results."
      );

      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // FORMAT NUMBERS
  // --------------------------------------------------

  function formatNumber(value: number) {
    return Number(value.toFixed(2));
  }

  function getPositionText(position: number) {
    if (
      position >= 11 &&
      position <= 13
    ) {
      return `${position}th`;
    }

    switch (position % 10) {
      case 1:
        return `${position}st`;

      case 2:
        return `${position}nd`;

      case 3:
        return `${position}rd`;

      default:
        return `${position}th`;
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (initialLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Loading results...
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="p-6">
      {/* HEADER */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Results
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Calculate and view student examination
          results.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* FILTERS */}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* ACADEMIC YEAR */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Academic Year
            </label>

            <select
              value={academicYearId}
              onChange={(event) => {
                setAcademicYearId(
                  event.target.value
                );
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">
                Select academic year
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

          {/* TERM */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Term
            </label>

            <select
              value={termId}
              onChange={(event) => {
                setTermId(event.target.value);
                setExamId("");
                setResults(null);
              }}
              disabled={!academicYearId}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-gray-100 focus:border-red-500 focus:ring-2 focus:ring-red-100"
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

          {/* CLASS */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Class
            </label>

            <select
              value={classId}
              onChange={(event) => {
                setClassId(event.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
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

          {/* EXAM */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Exam
            </label>

            <select
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setResults(null);
              }}
              disabled={!termId || !classId}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none disabled:bg-gray-100 focus:border-red-500 focus:ring-2 focus:ring-red-100"
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

          {/* GRADE SCALE */}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Grade Scale
            </label>

            <select
              value={gradeScaleId}
              onChange={(event) => {
                setGradeScaleId(
                  event.target.value
                );
                setResults(null);
              }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
            >
              <option value="">
                Select grade scale
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

        {/* CALCULATE BUTTON */}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={calculateResults}
            disabled={
              loading ||
              !examId ||
              !gradeScaleId
            }
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Calculating..."
              : "Calculate Results"}
          </button>
        </div>
      </div>

      {/* RESULTS */}

      {results && (
        <div className="mt-6">
          {/* EXAM INFORMATION */}

          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <div>
                <p className="text-xs text-gray-500">
                  Academic Year
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {results.exam.academicYear}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Term
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {results.exam.termName}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Class
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {results.exam.className}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Examination
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {results.exam.name}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Grade Scale
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {results.gradeScale.name}
                </p>
              </div>
            </div>
          </div>

          {/* SUMMARY TABLE */}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Student Results
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Results are calculated directly from
                the saved marks.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold text-gray-700">
                      Roll
                    </th>

                    <th className="px-4 py-3 font-semibold text-gray-700">
                      Student
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Total
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Percentage
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Grade
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      GPA
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Position
                    </th>

                    <th className="px-4 py-3 text-center font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {results.results.map(
                    (student) => (
                      <tr
                        key={student.studentId}
                        className="border-t border-gray-100 hover:bg-gray-50"
                      >
                        {/* ROLL */}

                        <td className="px-4 py-3">
                          {student.rollNumber ??
                            "-"}
                        </td>

                        {/* STUDENT */}

                        <td className="px-4 py-3 font-medium text-gray-900">
                          {student.studentName}
                        </td>

                        {/* TOTAL */}

                        <td className="px-4 py-3 text-center">
                          {formatNumber(
                            student.totalObtained
                          )}{" "}
                          /{" "}
                          {formatNumber(
                            student.totalFullMarks
                          )}
                        </td>

                        {/* PERCENTAGE */}

                        <td className="px-4 py-3 text-center">
                          {formatNumber(
                            student.overallPercentage
                          )}
                          %
                        </td>

                        {/* GRADE */}

                        <td className="px-4 py-3 text-center font-semibold">
                          {student.grade}
                        </td>

                        {/* GPA */}

                        <td className="px-4 py-3 text-center">
                          {formatNumber(
                            student.gpa
                          )}
                        </td>

                        {/* POSITION */}

                        <td className="px-4 py-3 text-center font-semibold">
                          {getPositionText(
                            student.position
                          )}
                        </td>

                        {/* REPORT CARD */}

                        <td className="px-4 py-3 text-center">
                          <a
                            href={`/dashboard/results/report-card?examId=${examId}&gradeScaleId=${gradeScaleId}&studentId=${student.studentId}`}
                            className="inline-block rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                          >
                            Report Card
                          </a>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* EMPTY RESULTS */}

            {results.results.length === 0 && (
              <div className="border-t border-gray-200 p-8 text-center text-sm text-gray-500">
                No students found for this
                examination.
              </div>
            )}
          </div>

          {/* DETAILED RESULTS */}

          <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900">
                Detailed Subject Results
              </h2>
            </div>

            <div className="space-y-6 p-5">
              {results.results.map(
                (student) => (
                  <div
                    key={student.studentId}
                    className="overflow-hidden rounded-lg border border-gray-200"
                  >
                    {/* STUDENT HEADER */}

                    <div className="flex flex-col justify-between gap-2 bg-gray-50 px-4 py-3 md:flex-row md:items-center">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {student.studentName}
                        </p>

                        <p className="text-xs text-gray-500">
                          Roll:{" "}
                          {student.rollNumber ??
                            "-"}
                        </p>
                      </div>

                      <a
                        href={`/dashboard/results/report-card?examId=${examId}&gradeScaleId=${gradeScaleId}&studentId=${student.studentId}`}
                        className="inline-block w-fit rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        View Report Card
                      </a>
                    </div>

                    {/* SUBJECT TABLE */}

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-t border-gray-200 bg-white">
                            <th className="px-4 py-3 text-left font-semibold text-gray-700">
                              Subject
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              Theory
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              Practical
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              Total
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              Full Marks
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              %
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              Grade
                            </th>

                            <th className="px-4 py-3 text-center font-semibold text-gray-700">
                              GP
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {student.subjects.map(
                            (subject) => (
                              <tr
                                key={
                                  subject.subjectId
                                }
                                className="border-t border-gray-100"
                              >
                                <td className="px-4 py-3 font-medium">
                                  {
                                    subject.subjectName
                                  }
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {formatNumber(
                                    subject.theoryMarks
                                  )}{" "}
                                  /{" "}
                                  {formatNumber(
                                    subject.theoryFullMarks
                                  )}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {formatNumber(
                                    subject.practicalMarks
                                  )}{" "}
                                  /{" "}
                                  {formatNumber(
                                    subject.practicalFullMarks
                                  )}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {formatNumber(
                                    subject.total
                                  )}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {formatNumber(
                                    subject.fullMarks
                                  )}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {formatNumber(
                                    subject.percentage
                                  )}
                                  %
                                </td>

                                <td className="px-4 py-3 text-center font-semibold">
                                  {subject.grade}
                                </td>

                                <td className="px-4 py-3 text-center">
                                  {formatNumber(
                                    subject.gradePoint
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>

                        {/* STUDENT TOTAL */}

                        <tfoot>
                          <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                            <td
                              colSpan={3}
                              className="px-4 py-3 text-right"
                            >
                              Overall
                            </td>

                            <td className="px-4 py-3 text-center">
                              {formatNumber(
                                student.totalObtained
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {formatNumber(
                                student.totalFullMarks
                              )}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {formatNumber(
                                student.overallPercentage
                              )}
                              %
                            </td>

                            <td className="px-4 py-3 text-center">
                              {student.grade}
                            </td>

                            <td className="px-4 py-3 text-center">
                              {formatNumber(
                                student.gpa
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}