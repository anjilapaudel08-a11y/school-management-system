import assert from "node:assert/strict";
import test from "node:test";
import { validateTeacherAssignmentRelationships } from "../src/lib/teacher-assignment-validation";

const configuredSchoolId = "configured-school";

test("valid class-subject assignments remain allowed across classes and subjects", () => {
  const validAssignments = [
    { classId: "class-a", subjectId: "subject-a" },
    { classId: "class-a", subjectId: "subject-b" },
    { classId: "class-b", subjectId: "subject-a" },
  ];

  for (const assignment of validAssignments) {
    assert.equal(
      validateTeacherAssignmentRelationships({
        configuredSchoolId,
        teacherSchoolId: configuredSchoolId,
        classSchoolId: configuredSchoolId,
        academicYearSchoolId: configuredSchoolId,
        hasClassSubject: true,
      }),
      null,
      `${assignment.classId}/${assignment.subjectId} should be valid`,
    );
  }
});

test("rejects relationships involving records from another school", () => {
  for (const relationship of [
    { teacherSchoolId: "other-school", classSchoolId: configuredSchoolId },
    { teacherSchoolId: configuredSchoolId, classSchoolId: "other-school" },
  ]) {
    assert.match(
      validateTeacherAssignmentRelationships({
        configuredSchoolId,
        ...relationship,
        academicYearSchoolId: configuredSchoolId,
        hasClassSubject: true,
      }) ?? "",
      /configured school/,
    );
  }

  assert.match(
    validateTeacherAssignmentRelationships({
      configuredSchoolId,
      teacherSchoolId: configuredSchoolId,
      classSchoolId: configuredSchoolId,
      academicYearSchoolId: "other-school",
      hasClassSubject: true,
    }) ?? "",
    /configured school/,
  );
});

test("rejects a subject that is not assigned to the class in that academic year", () => {
  assert.match(
    validateTeacherAssignmentRelationships({
      configuredSchoolId,
      teacherSchoolId: configuredSchoolId,
      classSchoolId: configuredSchoolId,
      academicYearSchoolId: configuredSchoolId,
      hasClassSubject: false,
    }) ?? "",
    /not been assigned to this class/,
  );
});
