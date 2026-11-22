import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { getVerifiedTestTarget } from "./billing/helpers/database.js";

test("student registration preserves manual numbers and safely allocates generated numbers", async () => {
  const target = getVerifiedTestTarget();
  process.env.DATABASE_URL = target.connectionString;
  let appPrisma;
  const createdStudentIds = [];

  try {
    const [{ prisma }, studentsApi, studentProfileApi] = await Promise.all([
      import("../src/lib/prisma.ts"),
      import("../src/app/api/students/route.ts"),
      import("../src/app/api/students/[id]/route.ts"),
    ]);
    appPrisma = prisma;
    const [databaseInfo] = await appPrisma.$queryRaw`
      SELECT current_database() AS database
    `;
    assert.equal(databaseInfo.database, target.database);

    const school = await appPrisma.school.findFirstOrThrow();
    const academicYear = await appPrisma.academicYear.findFirstOrThrow({
      where: { schoolId: school.id, isActive: true },
    });
    const schoolClass = await appPrisma.class.findFirstOrThrow({
      where: { schoolId: school.id },
      orderBy: { order: "asc" },
    });
    const marker = `QA-REG-${randomUUID()}`;
    const registration = {
      firstName: "QA Registration",
      admissionNumber: marker,
      academicYearId: academicYear.id,
      classId: schoolClass.id,
      rollNumber: 900,
    };

    const createdResponse = await studentsApi.POST(
      new Request("http://qa.local/api/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(registration),
      }),
    );
    assert.equal(createdResponse.status, 201);
    const createdStudent = await createdResponse.json();
    assert.equal(createdStudent.admissionNumber, marker);
    createdStudentIds.push(createdStudent.id);

    const updatedMarker = `${marker}-UPDATED`;
    const updatedResponse = await studentProfileApi.PATCH(
      new Request(`http://qa.local/api/students/${createdStudent.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...registration,
          admissionNumber: updatedMarker,
        }),
      }),
      { params: Promise.resolve({ id: createdStudent.id }) },
    );
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).admissionNumber, updatedMarker);

    const duplicateResponse = await studentsApi.POST(
      new Request("http://qa.local/api/students", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...registration,
          admissionNumber: updatedMarker,
        }),
      }),
    );
    if (duplicateResponse.status === 201) {
      createdStudentIds.push((await duplicateResponse.json()).id);
    }
    assert.equal(duplicateResponse.status, 409);

    const generatedResponses = await Promise.all(
      [1, 2].map(() =>
        studentsApi.POST(
          new Request("http://qa.local/api/students", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              firstName: "QA Generated",
              academicYearId: academicYear.id,
              classId: schoolClass.id,
              rollNumber: 901,
            }),
          }),
        ),
      ),
    );
    const generatedStudents = await Promise.all(
      generatedResponses.map(async (response) => {
        assert.equal(response.status, 201);
        return response.json();
      }),
    );
    createdStudentIds.push(...generatedStudents.map((student) => student.id));

    const duplicateUpdateResponse = await studentProfileApi.PATCH(
      new Request(
        `http://qa.local/api/students/${generatedStudents[0].id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName: "QA Generated",
            admissionNumber: updatedMarker,
            academicYearId: academicYear.id,
            classId: schoolClass.id,
            rollNumber: 902,
          }),
        },
      ),
      { params: Promise.resolve({ id: generatedStudents[0].id }) },
    );
    assert.equal(duplicateUpdateResponse.status, 409);

    const generatedNumbers = generatedStudents.map(
      (student) => student.admissionNumber,
    );
    assert.notEqual(generatedNumbers[0], generatedNumbers[1]);
    assert.ok(generatedNumbers.every((number) => /^ADM-\d{4,}$/.test(number)));
  } finally {
    if (createdStudentIds.length > 0) {
      await appPrisma.student.deleteMany({
        where: { id: { in: createdStudentIds } },
      });
    }
    if (appPrisma) await appPrisma.$disconnect();
  }
});
