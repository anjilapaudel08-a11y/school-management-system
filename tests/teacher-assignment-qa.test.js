import assert from "node:assert/strict";
import test from "node:test";
import { createHash, randomUUID } from "node:crypto";
import { getVerifiedTestTarget } from "./billing/helpers/database.js";

const primarySchoolId = "cmwtatkm10000row42cgw4b64";
const billingSchoolId = "cmwtawdr10000scw4moape0b6";

async function financialSnapshot(prisma) {
  const queries = [
    ["bills", () =>
      prisma.bill.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          totalAmount: true,
          discountAmount: true,
          paidAmount: true,
          status: true,
          billingDate: true,
          updatedAt: true,
        },
      })],
    ["billItems", () =>
      prisma.billItem.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          billId: true,
          amount: true,
          discountAmount: true,
          netAmount: true,
          createdAt: true,
        },
      })],
    ["payments", () =>
      prisma.payment.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          billId: true,
          amount: true,
          waiverAmount: true,
          paymentDate: true,
          updatedAt: true,
        },
      })],
    ["credits", () =>
      prisma.studentCredit.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          amount: true,
          appliedAmount: true,
          source: true,
          issueDate: true,
          updatedAt: true,
        },
      })],
    ["creditApplications", () =>
      prisma.billCreditApplication.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          billId: true,
          creditId: true,
          amount: true,
          reversedAt: true,
          createdAt: true,
        },
      })],
    ["expenses", () =>
      prisma.expense.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          academicYearId: true,
          amount: true,
          expenseDate: true,
          updatedAt: true,
        },
      })],
    ["feeStructures", () =>
      prisma.feeStructure.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          academicYearId: true,
          classId: true,
          amount: true,
          isActive: true,
          updatedAt: true,
        },
      })],
    ["studentCharges", () =>
      prisma.studentCharge.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          amount: true,
          updatedAt: true,
        },
      })],
    ["chargeApplications", () =>
      prisma.studentChargeApplication.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentChargeId: true,
          billId: true,
          isActive: true,
          releasedAt: true,
          createdAt: true,
        },
      })],
    ["discounts", () =>
      prisma.studentDiscount.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          percentage: true,
          isActive: true,
          updatedAt: true,
        },
      })],
    ["discountFees", () =>
      prisma.studentDiscountFee.findMany({
        orderBy: { id: "asc" },
        select: { id: true, discountId: true, feeType: true },
      })],
    ["teacherSalaries", () =>
      prisma.teacherSalary.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          teacherId: true,
          academicYearId: true,
          salaryAmount: true,
          deduction: true,
          netAmount: true,
          status: true,
          updatedAt: true,
        },
      })],
    ["teacherSalaryPayments", () =>
      prisma.teacherSalaryPayment.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          teacherSalaryId: true,
          amount: true,
          paymentDate: true,
          updatedAt: true,
        },
      })],
  ];

  const snapshot = {};
  for (const [name, query] of queries) {
    snapshot[name] = await query();
  }
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

async function billingSchoolSnapshot(prisma) {
  const billingSchool = await prisma.school.findUniqueOrThrow({
    where: { id: billingSchoolId },
    select: {
      id: true,
      name: true,
      shortName: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const tables = [
    ["years", () =>
      prisma.academicYear.findMany({
        where: { schoolId: billingSchoolId },
        orderBy: { id: "asc" },
        select: { id: true, name: true, isActive: true, updatedAt: true },
      })],
    ["classes", () =>
      prisma.class.findMany({
        where: { schoolId: billingSchoolId },
        orderBy: { id: "asc" },
        select: { id: true, name: true, order: true, updatedAt: true },
      })],
    ["sections", () =>
      prisma.section.findMany({
        where: { schoolId: billingSchoolId },
        orderBy: { id: "asc" },
        select: { id: true, name: true, updatedAt: true },
      })],
    ["teachers", () =>
      prisma.teacher.findMany({
        where: { schoolId: billingSchoolId },
        orderBy: { id: "asc" },
        select: { id: true, schoolId: true, updatedAt: true },
      })],
    ["students", () =>
      prisma.student.findMany({
        where: { schoolId: billingSchoolId },
        orderBy: { id: "asc" },
        select: { id: true, schoolId: true, updatedAt: true },
      })],
    ["enrollments", () =>
      prisma.enrollment.findMany({
        where: { student: { is: { schoolId: billingSchoolId } } },
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentId: true,
          academicYearId: true,
          classId: true,
          rollNumber: true,
          updatedAt: true,
        },
      })],
    ["classSubjects", () =>
      prisma.classSubject.findMany({
        where: { class: { is: { schoolId: billingSchoolId } } },
        orderBy: { id: "asc" },
        select: {
          id: true,
          classId: true,
          subjectId: true,
          academicYearId: true,
          updatedAt: true,
        },
      })],
    ["teacherAssignments", () =>
      prisma.teacherAssignment.findMany({
        where: { teacher: { is: { schoolId: billingSchoolId } } },
        orderBy: { id: "asc" },
        select: {
          id: true,
          teacherId: true,
          classId: true,
          subjectId: true,
          academicYearId: true,
          updatedAt: true,
        },
      })],
    ["exams", () =>
      prisma.exam.findMany({
        where: { class: { is: { schoolId: billingSchoolId } } },
        orderBy: { id: "asc" },
        select: { id: true, classId: true, name: true, updatedAt: true },
      })],
    ["marks", () =>
      prisma.mark.findMany({
        where: {
          student: { is: { schoolId: billingSchoolId } },
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          studentId: true,
          examSubjectId: true,
          theoryMarks: true,
          practicalMarks: true,
          updatedAt: true,
        },
      })],
  ];

  const snapshot = { billingSchool };
  for (const [name, query] of tables) {
    snapshot[name] = await query();
  }
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

async function postAssignment(api, assignment) {
  return api.POST(
    new Request("http://qa.local/api/teacher-assignments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(assignment),
    }),
  );
}

test("teacher assignment routes enforce school scope, preserve multiplicity, and clean up", async () => {
  const target = getVerifiedTestTarget();
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSchoolId = process.env.SCHOOL_ID;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.DATABASE_URL = target.connectionString;
  process.env.SCHOOL_ID = primarySchoolId;
  process.env.NODE_ENV = "test";

  let appPrisma;
  let billingSnapshot;
  let financesBefore;
  let temporaryTeacherId;
  let temporarySubjectId;

  try {
    const [
      { prisma },
      teachersApi,
      yearsApi,
      classesApi,
      studentsApi,
      assignmentsApi,
      assignmentItemApi,
    ] = await Promise.all([
      import("../src/lib/prisma.ts"),
      import("../src/app/api/teachers/route.ts"),
      import("../src/app/api/academic-years/route.ts"),
      import("../src/app/api/classes/route.ts"),
      import("../src/app/api/students/route.ts"),
      import("../src/app/api/teacher-assignments/route.ts"),
      import("../src/app/api/teacher-assignments/[id]/route.ts"),
    ]);
    appPrisma = prisma;

    const [databaseInfo] = await appPrisma.$queryRaw`
      SELECT current_database() AS database
    `;
    assert.equal(databaseInfo.database, target.database);

    const primarySchool = await appPrisma.school.findUniqueOrThrow({
      where: { id: primarySchoolId },
    });
    const billingSchool = await appPrisma.school.findUniqueOrThrow({
      where: { id: billingSchoolId },
    });
    assert.equal(primarySchool.name, "QA Academy - Fictional Test School");
    assert.equal(billingSchool.name, "BILL_QA_2083 Test School");
    assert.equal(
      await appPrisma.school.count(),
      2,
      "the existing QA school records must remain unchanged",
    );

    const [yearsResponse, classesResponse, teachersResponse, studentsResponse] =
      await Promise.all([
        yearsApi.GET(),
        classesApi.GET(),
        teachersApi.GET(),
        studentsApi.GET(),
      ]);
    for (const response of [
      yearsResponse,
      classesResponse,
      teachersResponse,
      studentsResponse,
    ]) {
      assert.equal(response.status, 200);
    }

    const [years, classes, teachers, students] = await Promise.all([
      yearsResponse.json(),
      classesResponse.json(),
      teachersResponse.json(),
      studentsResponse.json(),
    ]);
    assert.ok(years.length > 0);
    assert.ok(classes.length > 0);
    assert.ok(teachers.length > 0);
    assert.ok(students.length > 0);
    assert.ok(years.every((item) => item.schoolId === primarySchoolId));
    assert.ok(classes.every((item) => item.schoolId === primarySchoolId));
    assert.ok(teachers.every((item) => item.schoolId === primarySchoolId));
    assert.ok(students.every((item) => item.schoolId === primarySchoolId));
    assert.equal(
      students.length,
      await appPrisma.student.count({ where: { schoolId: primarySchoolId } }),
    );
    assert.equal(
      teachers.length,
      await appPrisma.teacher.count({ where: { schoolId: primarySchoolId } }),
    );
    assert.equal(
      classes.length,
      await appPrisma.class.count({ where: { schoolId: primarySchoolId } }),
    );

    const academicYear =
      years.find((year) => year.isActive) ?? years[0];
    const classSubjects = await appPrisma.classSubject.findMany({
      where: {
        academicYearId: academicYear.id,
        class: { is: { schoolId: primarySchoolId } },
      },
      include: {
        class: { select: { id: true, schoolId: true } },
        subject: { select: { id: true } },
      },
      orderBy: [{ classId: "asc" }, { subjectId: "asc" }],
    });
    const validPairs = [];
    for (const first of classSubjects) {
      const second = classSubjects.find(
        (candidate) =>
          candidate.classId !== first.classId &&
          candidate.subjectId !== first.subjectId,
      );
      if (second) {
        validPairs.push(first, second);
        break;
      }
    }
    assert.equal(validPairs.length, 2, "two distinct classes and subjects are needed");
    assert.ok(
      validPairs.every((pair) => pair.class.schoolId === primarySchoolId),
    );

    const temporaryTeacherResponse = await teachersApi.POST(
      new Request("http://qa.local/api/teachers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: `QA Assignment ${randomUUID()}`,
        }),
      }),
    );
    assert.equal(temporaryTeacherResponse.status, 201);
    const temporaryTeacher = await temporaryTeacherResponse.json();
    temporaryTeacherId = temporaryTeacher.id;
    assert.equal(temporaryTeacher.schoolId, primarySchoolId);

    const [billingTeacher, billingClass, billingYear] = await Promise.all([
      appPrisma.teacher.findFirstOrThrow({
        where: { schoolId: billingSchoolId },
        select: { id: true },
      }),
      appPrisma.class.findFirstOrThrow({
        where: { schoolId: billingSchoolId },
        select: { id: true },
      }),
      appPrisma.academicYear.findFirstOrThrow({
        where: { schoolId: billingSchoolId },
        select: { id: true },
      }),
    ]);
    const primaryAssignmentCount =
      await appPrisma.teacherAssignment.count({
        where: { teacher: { is: { schoolId: primarySchoolId } } },
      });
    billingSnapshot = await billingSchoolSnapshot(appPrisma);
    financesBefore = await financialSnapshot(appPrisma);

    const validAssignments = validPairs.map((pair) => ({
      teacherId: temporaryTeacherId,
      classId: pair.classId,
      subjectId: pair.subjectId,
      academicYearId: academicYear.id,
    }));
    const firstValid = await postAssignment(assignmentsApi, validAssignments[0]);
    const secondValid = await postAssignment(assignmentsApi, validAssignments[1]);
    assert.equal(firstValid.status, 201);
    assert.equal(secondValid.status, 201);
    const firstAssignment = await firstValid.json();
    const secondAssignment = await secondValid.json();
    assert.notEqual(firstAssignment.classId, secondAssignment.classId);
    assert.notEqual(firstAssignment.subjectId, secondAssignment.subjectId);

    const afterValidCount = await appPrisma.teacherAssignment.count({
      where: { teacherId: temporaryTeacherId },
    });
    assert.equal(afterValidCount, 2);

    const duplicateResponse = await postAssignment(
      assignmentsApi,
      validAssignments[0],
    );
    assert.equal(duplicateResponse.status, 409);
    assert.equal(
      await appPrisma.teacherAssignment.count({
        where: { teacherId: temporaryTeacherId },
      }),
      afterValidCount,
    );

    const readResponse = await assignmentsApi.GET(
      new Request(
        `http://qa.local/api/teacher-assignments?academicYearId=${academicYear.id}`,
      ),
    );
    assert.equal(readResponse.status, 200);
    const visibleAssignments = await readResponse.json();
    for (const id of [firstAssignment.id, secondAssignment.id]) {
      assert.ok(visibleAssignments.some((item) => item.id === id));
    }
    assert.ok(
      visibleAssignments.every(
        (item) => item.teacher.schoolId === primarySchoolId,
      ),
    );

    const invalidAssignments = [
      {
        ...validAssignments[0],
        teacherId: billingTeacher.id,
      },
      {
        ...validAssignments[0],
        classId: billingClass.id,
      },
      {
        ...validAssignments[0],
        academicYearId: billingYear.id,
      },
    ];
    for (const invalidAssignment of invalidAssignments) {
      const rejected = await postAssignment(assignmentsApi, invalidAssignment);
      assert.ok([400, 404].includes(rejected.status));
      assert.equal(
        await appPrisma.teacherAssignment.count({
          where: { teacherId: temporaryTeacherId },
        }),
        afterValidCount,
      );
    }

    const configuredSubjects = new Set(
      classSubjects
        .filter((pair) => pair.classId === validPairs[0].classId)
        .map((pair) => pair.subjectId),
    );
    const unassignedSubject = await appPrisma.subject.findFirst({
      where: { id: { notIn: [...configuredSubjects] } },
      select: { id: true },
    });
    let unassignedSubjectId = unassignedSubject?.id;
    if (!unassignedSubjectId) {
      const temporarySubject = await appPrisma.subject.create({
        data: { name: `QA Unassigned ${randomUUID()}` },
        select: { id: true },
      });
      temporarySubjectId = temporarySubject.id;
      unassignedSubjectId = temporarySubject.id;
    }
    const unconfiguredSubjectResponse = await postAssignment(
      assignmentsApi,
      {
        ...validAssignments[0],
        subjectId: unassignedSubjectId,
      },
    );
    assert.equal(unconfiguredSubjectResponse.status, 400);
    assert.match(
      (await unconfiguredSubjectResponse.json()).error,
      /not been assigned to this class/,
    );
    assert.equal(
      await appPrisma.teacherAssignment.count({
        where: { teacherId: temporaryTeacherId },
      }),
      afterValidCount,
    );

    for (const assignment of [firstAssignment, secondAssignment]) {
      const deleted = await assignmentItemApi.DELETE(
        new Request(`http://qa.local/api/teacher-assignments/${assignment.id}`, {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: assignment.id }) },
      );
      assert.equal(deleted.status, 200);
    }
    assert.equal(
      await appPrisma.teacherAssignment.count({
        where: { teacherId: temporaryTeacherId },
      }),
      0,
    );
    assert.equal(
      await appPrisma.teacherAssignment.count({
        where: { teacher: { is: { schoolId: primarySchoolId } } },
      }),
      primaryAssignmentCount,
    );
  } finally {
    if (appPrisma) {
      if (temporaryTeacherId) {
        await appPrisma.teacherAssignment.deleteMany({
          where: { teacherId: temporaryTeacherId },
        });
        await appPrisma.teacher.deleteMany({
          where: { id: temporaryTeacherId, schoolId: primarySchoolId },
        });
      }
      if (temporarySubjectId) {
        await appPrisma.subject.deleteMany({
          where: { id: temporarySubjectId },
        });
      }

      if (billingSnapshot) {
        assert.equal(
          await billingSchoolSnapshot(appPrisma),
          billingSnapshot,
          "the artificial billing school and its fixtures must remain unchanged",
        );
      }
      if (financesBefore) {
        assert.equal(
          await financialSnapshot(appPrisma),
          financesBefore,
          "financial records must remain unchanged",
        );
      }

      await appPrisma.$disconnect();
    }

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
