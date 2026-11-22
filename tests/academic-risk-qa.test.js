import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import {
  getVerifiedTestTarget,
} from "./billing/helpers/database.js";

test("exam protection and concurrent salary payments work on QA database", async () => {
  const target = getVerifiedTestTarget();
  process.env.DATABASE_URL = target.connectionString;
  let appPrisma;
  let fixture;

  try {
    const [{ prisma }, examApi, publishApi, marksApi, resultsApi, salaryPayments] =
      await Promise.all([
        import("../src/lib/prisma.ts"),
        import("../src/app/api/exams/[id]/route.ts"),
        import("../src/app/api/exams/[id]/publish/route.ts"),
        import("../src/app/api/marks/route.ts"),
        import("../src/app/api/results/route.ts"),
        import("../src/lib/teacher-salary-payment.ts"),
      ]);
    appPrisma = prisma;
      const [databaseInfo] = await appPrisma.$queryRaw`
        SELECT current_database() AS database
      `;
      assert.equal(databaseInfo.database, target.database);

      const marker = `ACADEMIC_RISK_QA_${randomUUID()}`;
      const school = await appPrisma.school.create({ data: { name: marker } });
    fixture = {
      schoolId: school.id,
      academicYearId: null,
      subjectId: null,
      gradeScaleId: null,
      examId: null,
      studentIds: [],
      teacherId: null,
      salaryId: null,
    };
    const academicYear = await appPrisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: marker,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
      },
    });
    fixture.academicYearId = academicYear.id;
    const term = await appPrisma.academicTerm.create({
      data: {
        academicYearId: academicYear.id,
        name: marker,
        order: 1,
      },
    });
    const classRecord = await appPrisma.class.create({
      data: { schoolId: school.id, name: marker, order: 1 },
    });
    const subject = await appPrisma.subject.create({
      data: { name: marker },
    });
    fixture.subjectId = subject.id;
    const students = [];
    for (const number of [1, 2]) {
      const student = await appPrisma.student.create({
          data: {
            schoolId: school.id,
            admissionNumber: `${marker}_${number}`,
            firstName: `${marker} ${number}`,
          },
        });
      students.push(student);
      fixture.studentIds.push(student.id);
    }
    await appPrisma.enrollment.createMany({
      data: students.map((student, index) => ({
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: classRecord.id,
        rollNumber: index + 1,
      })),
    });
    const exam = await appPrisma.exam.create({
      data: {
        termId: term.id,
        classId: classRecord.id,
        name: marker,
      },
    });
    fixture.examId = exam.id;
    const examSubject = await appPrisma.examSubject.create({
      data: {
        examId: exam.id,
        subjectId: subject.id,
        theoryFullMarks: 100,
        practicalFullMarks: 0,
      },
    });
    const gradeScale = await appPrisma.gradeScale.create({
      data: {
        name: marker,
        entries: {
          create: {
            minPercentage: 0,
            maxPercentage: 100,
            grade: "A",
            gradePoint: 4,
          },
        },
      },
    });
    fixture.gradeScaleId = gradeScale.id;
    const teacher = await appPrisma.teacher.create({
      data: { schoolId: school.id, firstName: marker },
    });
    fixture.teacherId = teacher.id;
    const salary = await appPrisma.teacherSalary.create({
      data: {
        teacherId: teacher.id,
        academicYearId: academicYear.id,
        month: 1,
        year: 2026,
        salaryAmount: 10000,
        netAmount: 10000,
      },
    });
    fixture.salaryId = salary.id;

    const missingMarksResponse = await publishApi.POST(
      new Request(`http://qa.local/api/exams/${exam.id}/publish`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: exam.id }) },
    );
    const missingMarks = await missingMarksResponse.json();
    assert.equal(missingMarksResponse.status, 409);
    assert.match(missingMarks.error, /2 student-subject mark entries are missing/);

    const firstMarkResponse = await marksApi.POST(
      new Request("http://qa.local/api/marks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examSubjectId: examSubject.id,
          studentId: students[0].id,
          theoryMarks: 85,
          practicalMarks: 0,
        }),
      }),
    );
    assert.equal(firstMarkResponse.status, 200);

    const blockedDeleteResponse = await examApi.DELETE(
      new Request(`http://qa.local/api/exams/${exam.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: exam.id }) },
    );
    assert.equal(blockedDeleteResponse.status, 409);

    const secondMarkResponse = await marksApi.POST(
      new Request("http://qa.local/api/marks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examSubjectId: examSubject.id,
          studentId: students[1].id,
          theoryMarks: 75,
          practicalMarks: 0,
        }),
      }),
    );
    assert.equal(secondMarkResponse.status, 200);

    const publishResponse = await publishApi.POST(
      new Request(`http://qa.local/api/exams/${exam.id}/publish`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: exam.id }) },
    );
    assert.equal(publishResponse.status, 200);
    const published = await appPrisma.exam.findUniqueOrThrow({
      where: { id: exam.id },
    });
    assert.equal(published.isPublished, true);
    assert.equal(published.isLocked, true);

    const resultsResponse = await resultsApi.GET(
      new Request(
        `http://qa.local/api/results?examId=${exam.id}&gradeScaleId=${gradeScale.id}`,
      ),
    );
    assert.equal(resultsResponse.status, 200);
    const results = await resultsResponse.json();
    assert.equal(results.results.length, 2);

    const blockedMarkResponse = await marksApi.POST(
      new Request("http://qa.local/api/marks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examSubjectId: examSubject.id,
          studentId: students[0].id,
          theoryMarks: 90,
          practicalMarks: 0,
        }),
      }),
    );
    assert.equal(blockedMarkResponse.status, 409);

    const concurrentPayments = await Promise.all(
      [1, 2].map(async () => {
        try {
          await appPrisma.$transaction(
            (tx) =>
              salaryPayments.recordTeacherSalaryPayment(tx, {
                teacherSalaryId: salary.id,
                amount: 7000,
                paymentDate: new Date("2026-01-15T12:00:00.000Z"),
                method: "CASH",
                reference: null,
                notes: marker,
              }),
            { maxWait: 15_000, timeout: 20_000 },
          );
          return "accepted";
        } catch (error) {
          if (
            error instanceof salaryPayments.SalaryPaymentRequestError &&
            error.status === 400
          ) {
            return "rejected";
          }
          throw error;
        }
      }),
    );
    assert.deepEqual(concurrentPayments.sort(), ["accepted", "rejected"]);

    const persistedPayments = await appPrisma.teacherSalaryPayment.findMany({
      where: { teacherSalaryId: salary.id },
    });
    assert.equal(persistedPayments.length, 1);
    assert.equal(
      persistedPayments.reduce((sum, payment) => sum + Number(payment.amount), 0),
      7000,
    );

    const finalDeleteResponse = await examApi.DELETE(
      new Request(`http://qa.local/api/exams/${exam.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: exam.id }) },
    );
    assert.equal(finalDeleteResponse.status, 409);
  } finally {
    if (fixture) {
      if (fixture.salaryId) {
        await appPrisma.teacherSalaryPayment.deleteMany({
          where: { teacherSalaryId: fixture.salaryId },
        });
        await appPrisma.teacherSalary.deleteMany({
          where: { id: fixture.salaryId },
        });
      }
      if (fixture.teacherId) {
        await appPrisma.teacher.deleteMany({
          where: { id: fixture.teacherId },
        });
      }
      if (fixture.gradeScaleId) {
        await appPrisma.gradeScale.deleteMany({
          where: { id: fixture.gradeScaleId },
        });
      }
      if (fixture.examId) {
        await appPrisma.exam.deleteMany({
          where: { id: fixture.examId },
        });
      }
      if (fixture.subjectId) {
        await appPrisma.subject.deleteMany({
          where: { id: fixture.subjectId },
        });
      }
      if (fixture.studentIds.length > 0) {
        await appPrisma.enrollment.deleteMany({
          where: { studentId: { in: fixture.studentIds } },
        });
        await appPrisma.student.deleteMany({
          where: { id: { in: fixture.studentIds } },
        });
      }
      if (fixture.academicYearId) {
        await appPrisma.academicTerm.deleteMany({
          where: { academicYearId: fixture.academicYearId },
        });
        await appPrisma.academicYear.deleteMany({
          where: { id: fixture.academicYearId },
        });
      }
      await appPrisma.school.deleteMany({
        where: { id: fixture.schoolId },
      });
    }
    if (appPrisma) await appPrisma.$disconnect();
  }
});
