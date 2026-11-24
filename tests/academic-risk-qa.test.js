import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { getVerifiedTestTarget } from "./billing/helpers/database.js";

test("exam protection and mark publication work on QA database", async () => {
  const target = getVerifiedTestTarget();
  const primarySchoolId = "cmwtatkm10000row42cgw4b64";
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSchoolId = process.env.SCHOOL_ID;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DATABASE_URL = target.connectionString;
  process.env.SCHOOL_ID = primarySchoolId;
  process.env.NODE_ENV = "test";
  let appPrisma;
  let fixture;

  try {
    const [{ prisma }, examApi, publishApi, marksApi, resultsApi] =
      await Promise.all([
        import("../src/lib/prisma.ts"),
        import("../src/app/api/exams/[id]/route.ts"),
        import("../src/app/api/exams/[id]/publish/route.ts"),
        import("../src/app/api/marks/route.ts"),
        import("../src/app/api/results/route.ts"),
      ]);
    appPrisma = prisma;
    const [databaseInfo] = await appPrisma.$queryRaw`
      SELECT current_database() AS database
    `;
    assert.equal(databaseInfo.database, target.database);

    const marker = `ACADEMIC_RISK_QA_${randomUUID()}`;
    const school = await appPrisma.school.findUniqueOrThrow({
      where: { id: primarySchoolId },
    });
    const academicYear =
      await appPrisma.academicYear.findFirstOrThrow({
        where: { schoolId: school.id, isActive: true },
      });
    fixture = {
      termId: null,
      classId: null,
      subjectId: null,
      examId: null,
      studentIds: [],
    };
    const maxTermOrder = await appPrisma.academicTerm.aggregate({
      where: { academicYearId: academicYear.id },
      _max: { order: true },
    });
    const term = await appPrisma.academicTerm.create({
      data: {
        academicYearId: academicYear.id,
        name: marker,
        order: (maxTermOrder._max.order ?? 0) + 1,
      },
    });
    fixture.termId = term.id;
    const classRecord = await appPrisma.class.create({
      data: { schoolId: school.id, name: marker, order: 1 },
    });
    fixture.classId = classRecord.id;
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
        theoryFullMarks: 200,
        practicalFullMarks: 0,
      },
    });
    const gradeScale = await appPrisma.gradeScale.findFirstOrThrow({
      where: { isDefault: true },
    });

    const missingMarksResponse = await publishApi.POST(
      new Request(`http://qa.local/api/exams/${exam.id}/publish`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: exam.id }) },
    );
    const missingMarks = await missingMarksResponse.json();
    assert.equal(missingMarksResponse.status, 409);
    assert.match(missingMarks.error, /2 student-subject mark entries are missing/);

    const omittedMarkResponse = await marksApi.POST(
      new Request("http://qa.local/api/marks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examSubjectId: examSubject.id,
          studentId: students[0].id,
        }),
      }),
    );
    assert.equal(omittedMarkResponse.status, 400);
    assert.equal(
      await appPrisma.mark.count({
        where: {
          examSubjectId: examSubject.id,
          studentId: students[0].id,
        },
      }),
      0,
    );

    const blankMarkResponse = await marksApi.POST(
      new Request("http://qa.local/api/marks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examSubjectId: examSubject.id,
          studentId: students[0].id,
          theoryMarks: "",
          practicalMarks: 0,
        }),
      }),
    );
    assert.equal(blankMarkResponse.status, 400);

    const firstMarkResponse = await marksApi.POST(
      new Request("http://qa.local/api/marks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examSubjectId: examSubject.id,
          studentId: students[0].id,
          theoryMarks: 0,
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
          theoryMarks: 179.99,
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
    assert.equal(published.gradeScaleId, gradeScale.id);

    const resultsResponse = await resultsApi.GET(
      new Request(
        `http://qa.local/api/results?examId=${exam.id}&gradeScaleId=${gradeScale.id}`,
      ),
    );
    assert.equal(resultsResponse.status, 200);
    const results = await resultsResponse.json();
    assert.equal(results.results.length, 2);
    const zeroMarkResult = results.results.find(
      (result) => result.studentId === students[0].id,
    );
    const nearThresholdResult = results.results.find(
      (result) => result.studentId === students[1].id,
    );
    assert.equal(zeroMarkResult.subjects[0].grade, "NG");
    assert.equal(zeroMarkResult.subjects[0].performanceLevel, "Not Graded");
    assert.equal(nearThresholdResult.subjects[0].percentage, 89.995);
    assert.equal(nearThresholdResult.subjects[0].grade, "A");

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

    const finalDeleteResponse = await examApi.DELETE(
      new Request(`http://qa.local/api/exams/${exam.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: exam.id }) },
    );
    assert.equal(finalDeleteResponse.status, 409);
  } finally {
    if (fixture) {
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
      if (fixture.termId) {
        await appPrisma.academicTerm.deleteMany({
          where: { id: fixture.termId },
        });
      }
      if (fixture.classId) {
        await appPrisma.class.deleteMany({
          where: { id: fixture.classId, schoolId: primarySchoolId },
        });
      }
    }
    if (appPrisma) await appPrisma.$disconnect();
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    if (previousSchoolId === undefined) {
      delete process.env.SCHOOL_ID;
    } else {
      process.env.SCHOOL_ID = previousSchoolId;
    }
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
});
