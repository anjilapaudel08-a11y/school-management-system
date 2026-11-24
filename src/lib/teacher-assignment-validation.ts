type TeacherAssignmentRelationships = {
  configuredSchoolId: string;
  teacherSchoolId: string;
  classSchoolId: string;
  academicYearSchoolId: string;
  hasClassSubject: boolean;
};

export function validateTeacherAssignmentRelationships(
  relationships: TeacherAssignmentRelationships,
): string | null {
  if (
    relationships.teacherSchoolId !== relationships.configuredSchoolId ||
    relationships.classSchoolId !== relationships.configuredSchoolId ||
    relationships.academicYearSchoolId !== relationships.configuredSchoolId
  ) {
    return "Teacher, class, and academic year must belong to the configured school.";
  }

  if (!relationships.hasClassSubject) {
    return "This subject has not been assigned to this class for the selected academic year.";
  }

  return null;
}
