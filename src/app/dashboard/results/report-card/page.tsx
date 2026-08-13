"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type School = {
  id: string;
  name: string;
  shortName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  establishedYear: number | null;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
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

  

  results: StudentResult[];
};

export default function ReportCardPage() {
  const searchParams = useSearchParams();

  const examId = searchParams.get("examId");
  const gradeScaleId = searchParams.get("gradeScaleId");
  const studentId = searchParams.get("studentId");

  const [school, setSchool] = useState<School | null>(null);

  const [results, setResults] =
    useState<ResultsResponse | null>(null);

  const [student, setStudent] =
    useState<StudentResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --------------------------------------------------
  // FORMAT NUMBER
  // --------------------------------------------------

  function formatNumber(value: number) {
    return Number(value.toFixed(2));
  }

  // --------------------------------------------------
  // POSITION
  // --------------------------------------------------

  function getPositionText(position: number) {
    if (position >= 11 && position <= 13) {
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
  // LOAD DATA
  // --------------------------------------------------

  useEffect(() => {
    async function loadReportCard() {
      if (!examId || !gradeScaleId || !studentId) {
        setError(
          "Missing report card information."
        );

        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const [
          schoolResponse,
          resultsResponse,
        ] = await Promise.all([
          fetch("/api/school"),
          fetch(
            `/api/results?examId=${examId}&gradeScaleId=${gradeScaleId}`
          ),
        ]);

        const schoolData =
          await schoolResponse.json();

        const resultsData =
          await resultsResponse.json();

        if (!schoolResponse.ok) {
          throw new Error(
            schoolData.error ||
              "Failed to load school information."
          );
        }

        if (!resultsResponse.ok) {
          throw new Error(
            resultsData.error ||
              "Failed to load results."
          );
        }

        const selectedStudent =
          resultsData.results?.find(
            (item: StudentResult) =>
              item.studentId === studentId
          );

        if (!selectedStudent) {
          throw new Error(
            "Student result not found."
          );
        }

        setSchool(schoolData);
        setResults(resultsData);
        setStudent(selectedStudent);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load report card."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReportCard();
  }, [examId, gradeScaleId, studentId]);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Loading report card...
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error || !school || !results || !student) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ||
            "Unable to load report card."}
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // REPORT CARD
  // --------------------------------------------------

  return (
    <>
      {/* PRINT BUTTON */}

      <div className="mb-5 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Print Report Card
        </button>
      </div>

      {/* REPORT CARD */}

      <div className="mx-auto max-w-5xl bg-white p-6 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* SCHOOL HEADER */}

        <div className="border-b-2 border-red-600 pb-4">
          <div className="flex items-center justify-center gap-4">
            {/* LOGO */}

            {school.logo ? (
              <img
                src={school.logo}
                alt={school.name}
                className="h-20 w-20 object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-gray-300 text-xs text-gray-400">
                LOGO
              </div>
            )}

            {/* SCHOOL INFORMATION */}

            <div className="text-center">
              <h1 className="text-2xl font-bold uppercase text-gray-900">
                {school.name}
              </h1>

              {school.shortName && (
                <p className="mt-0.5 text-sm font-semibold text-gray-700">
                  {school.shortName}
                </p>
              )}

              {school.address && (
                <p className="mt-1 text-sm text-gray-600">
                  {school.address}
                </p>
              )}

              <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
                {school.phone && (
                  <span>
                    Phone: {school.phone}
                  </span>
                )}

                {school.email && (
                  <span>
                    Email: {school.email}
                  </span>
                )}

                {school.website && (
                  <span>
                    {school.website}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* REPORT TITLE */}

        <div className="py-5 text-center">
          <h2 className="text-xl font-bold uppercase tracking-wide text-gray-900">
            Student Report Card
          </h2>

          <p className="mt-1 text-sm font-medium text-gray-600">
            {results.exam.name}
          </p>
        </div>

        {/* EXAM INFORMATION */}

        <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-gray-300 p-4 text-center md:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">
              Academic Year
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
              {results.exam.academicYear}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Term
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
              {results.exam.termName}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Class
            </p>

            <p className="mt-1 text-sm font-semibold text-gray-900">
              {results.exam.className}
            </p>
          </div>

          
        </div>

        {/* STUDENT INFORMATION */}

        <div className="mb-5 rounded-lg border border-gray-300">
          <div className="border-b border-gray-300 bg-gray-50 px-4 py-2">
            <h3 className="text-sm font-bold uppercase text-gray-800">
              Student Information
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 text-center md:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">
                Student Name
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {student.studentName}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Roll Number
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {student.rollNumber ?? "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Class
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {results.exam.className}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                Position
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {getPositionText(
                  student.position
                )}
              </p>
            </div>
          </div>
        </div>

        {/* MARKS TABLE */}

        <div className="mb-5 overflow-hidden rounded-lg border border-gray-300">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-2 text-left">
                  S.N.
                </th>

                <th className="border border-gray-300 px-2 py-2 text-left">
                  Subject
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  Theory
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  Practical
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  Total
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  Full Marks
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  %
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  Grade
                </th>

                <th className="border border-gray-300 px-2 py-2 text-center">
                  GP
                </th>
              </tr>
            </thead>

            <tbody>
              {student.subjects.map(
                (subject, index) => (
                  <tr key={subject.subjectId}>
                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {index + 1}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 font-medium">
                      {subject.subjectName}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {formatNumber(
                        subject.theoryMarks
                      )}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {formatNumber(
                        subject.practicalMarks
                      )}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {formatNumber(
                        subject.total
                      )}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {formatNumber(
                        subject.fullMarks
                      )}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {formatNumber(
                        subject.percentage
                      )}
                      %
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center font-semibold">
                      {subject.grade}
                    </td>

                    <td className="border border-gray-300 px-2 py-2 text-center">
                      {formatNumber(
                        subject.gradePoint
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>

            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td
                  colSpan={4}
                  className="border border-gray-300 px-2 py-2 text-right"
                >
                  Overall
                </td>

                <td className="border border-gray-300 px-2 py-2 text-center">
                  {formatNumber(
                    student.totalObtained
                  )}
                </td>

                <td className="border border-gray-300 px-2 py-2 text-center">
                  {formatNumber(
                    student.totalFullMarks
                  )}
                </td>

                <td className="border border-gray-300 px-2 py-2 text-center">
                  {formatNumber(
                    student.overallPercentage
                  )}
                  %
                </td>

                <td className="border border-gray-300 px-2 py-2 text-center">
                  {student.grade}
                </td>

                <td className="border border-gray-300 px-2 py-2 text-center">
                  {formatNumber(student.gpa)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* RESULT SUMMARY */}

        <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500">
              Percentage
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatNumber(
                student.overallPercentage
              )}
              %
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500">
              Grade
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {student.grade}
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500">
              GPA
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {formatNumber(student.gpa)}
            </p>
          </div>

          <div className="rounded-lg border border-gray-300 p-3 text-center">
            <p className="text-xs text-gray-500">
              Position
            </p>

            <p className="mt-1 text-lg font-bold text-gray-900">
              {getPositionText(
                student.position
              )}
            </p>
          </div>
        </div>

        {/* REMARK */}

        <div className="mb-10 rounded-lg border border-gray-300 p-4">
          <p className="text-xs font-semibold uppercase text-gray-500">
            Remarks
          </p>

          <div className="mt-5 border-b border-gray-300" />
        </div>

        {/* SIGNATURES */}

        <div className="grid grid-cols-3 gap-8 pt-8 text-center">
          <div>
            <div className="mx-auto mb-2 w-36 border-b border-gray-500" />

            <p className="text-xs font-medium text-gray-600">
              Class Teacher
            </p>
          </div>

          <div>
            <div className="mx-auto mb-2 w-36 border-b border-gray-500" />

            <p className="text-xs font-medium text-gray-600">
              Principal
            </p>
          </div>

          <div>
            <div className="mx-auto mb-2 w-36 border-b border-gray-500" />

            <p className="text-xs font-medium text-gray-600">
              Parent / Guardian
            </p>
          </div>
        </div>

        {/* FOOTER */}

        <div className="mt-8 border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
          {school.name}

          {school.establishedYear && (
            <>
              {" "}
              • Established{" "}
              {school.establishedYear}
            </>
          )}
        </div>
      </div>

      {/* PRINT STYLES */}

      <style jsx global>{`
        @page {
          size: A4;
          margin: 12mm;
        }

        @media print {
          body {
            background: white !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}