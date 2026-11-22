import "dotenv/config";
import { stat } from "node:fs/promises";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { bsToDate } from "../../src/lib/nepali-date";

const approvedHost =
  "ep-green-glade-ayptuugl-pooler.c-5.us-east-2.aws.neon.tech";
const approvedDatabase = "neondb";
const applicationTables = [
  "AcademicTerm",
  "AcademicYear",
  "Bill",
  "BillCreditApplication",
  "BillItem",
  "Class",
  "ClassSubject",
  "Enrollment",
  "Exam",
  "ExamSubject",
  "Expense",
  "FeeStructure",
  "GradeScale",
  "GradeScaleEntry",
  "Infrastructure",
  "Mark",
  "Payment",
  "School",
  "Section",
  "Student",
  "StudentCharge",
  "StudentChargeApplication",
  "StudentCredit",
  "StudentDiscount",
  "StudentDiscountFee",
  "Subject",
  "Teacher",
  "TeacherAssignment",
  "TeacherSalary",
  "TeacherSalaryPayment",
  "User",
].sort();
const classNames = [
  "Pre Nursery",
  "Nursery",
  "LKG",
  "UKG",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
];
const subjectData = [
  { name: "English", code: "ENG" },
  { name: "Nepali", code: "NEP" },
  { name: "Mathematics", code: "MATH" },
  { name: "Science", code: "SCI" },
  { name: "Social Studies", code: "SOC" },
];
const boundaryPercentages = [
  0, 34.99, 35, 39.99, 40, 49.99, 50, 59.99, 60, 69.99, 70, 79.99, 80,
  89.99, 90, 100,
];

function assertTarget(connectionString: string) {
  const target = new URL(connectionString);
  const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    target.hostname !== approvedHost ||
    database !== approvedDatabase ||
    process.env.QA_RESET_EXPECTED_HOST !== approvedHost ||
    process.env.QA_RESET_EXPECTED_DATABASE !== approvedDatabase
  ) {
    throw new Error("Refusing to reset a database outside the approved QA target.");
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const backupPath = process.env.QA_RESET_BACKUP_FILE;
  if (process.env.QA_RESET_CONFIRMATION !== "RESET_ISOLATED_QA_DATABASE") {
    throw new Error(
      "Set QA_RESET_CONFIRMATION=RESET_ISOLATED_QA_DATABASE to authorize this QA-only reset.",
    );
  }
  if (!connectionString || !backupPath) {
    throw new Error("DATABASE_URL and QA_RESET_BACKUP_FILE are required.");
  }
  assertTarget(connectionString);
  const backup = await stat(backupPath);
  if (!backup.isFile() || backup.size < 1000) {
    throw new Error("The verified pre-reset QA data backup is missing or empty.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const databaseInfo = await prisma.$queryRaw<
      { database: string; migrationCount: bigint }[]
    >`
      SELECT current_database() AS database,
             COUNT(*) FILTER (
               WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
             ) AS "migrationCount"
      FROM "_prisma_migrations"
    `;
    if (
      databaseInfo[0]?.database !== approvedDatabase ||
      Number(databaseInfo[0]?.migrationCount) !== 15
    ) {
      throw new Error(
        "Database identity or applied migration count differs from the verified QA baseline.",
      );
    }

    const existingTables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      ORDER BY table_name
    `;
    const tableNames = existingTables.map((table) => table.table_name).sort();
    if (JSON.stringify(tableNames) !== JSON.stringify(applicationTables)) {
      throw new Error(
        "Application table inventory differs from the reviewed reset allowlist.",
      );
    }

    const truncate = `TRUNCATE TABLE ${applicationTables
      .map((table) => `public."${table}"`)
      .join(", ")} RESTART IDENTITY`;

    const seededCounts = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(truncate);

        const school = await tx.school.create({
          data: {
            name: "QA Academy - Fictional Test School",
            shortName: "QA-A",
            address: "Fictional QA address, Pokhara",
            email: "office@example.test",
            establishedYear: 2083,
            description: "Synthetic records for isolated application QA.",
          },
        });

        const year83 = await tx.academicYear.create({
          data: {
            schoolId: school.id,
            name: "2083",
            startDate: bsToDate(2083, 1, 1),
            endDate: bsToDate(2083, 12, 30),
            isActive: true,
          },
        });
        const year84 = await tx.academicYear.create({
          data: {
            schoolId: school.id,
            name: "2084",
            startDate: bsToDate(2084, 1, 1),
            endDate: bsToDate(2084, 12, 30),
            isActive: false,
          },
        });

        await tx.academicTerm.createMany({
          data: [year83, year84].flatMap((year) =>
            [1, 2, 3, 4].map((order) => ({
              academicYearId: year.id,
              name: `Term ${order}`,
              order,
            })),
          ),
        });

        await tx.class.createMany({
          data: classNames.map((name, index) => ({
            schoolId: school.id,
            name,
            order: index + 1,
          })),
        });
        await tx.subject.createMany({ data: subjectData });
        const classes = await tx.class.findMany({
          where: { schoolId: school.id },
          orderBy: { order: "asc" },
        });
        const subjects = await tx.subject.findMany({
          orderBy: { code: "asc" },
        });
        await tx.classSubject.createMany({
          data: [year83, year84].flatMap((year) =>
            classes.flatMap((schoolClass) =>
              subjects.map((subject) => ({
                classId: schoolClass.id,
                subjectId: subject.id,
                academicYearId: year.id,
              })),
            ),
          ),
        });

        const gradeScale = await tx.gradeScale.create({
          data: {
            name: "Approved QA Percentage Scale",
            description: "Approved raw-percentage grading scale for QA.",
            isDefault: true,
            usesExclusiveUpperBounds: true,
            entries: {
              create: [
                { minPercentage: 90, maxPercentage: 100, grade: "A+", gradePoint: 4 },
                { minPercentage: 80, maxPercentage: 90, grade: "A", gradePoint: 3.6 },
                { minPercentage: 70, maxPercentage: 80, grade: "B+", gradePoint: 3.2 },
                { minPercentage: 60, maxPercentage: 70, grade: "B", gradePoint: 2.8 },
                { minPercentage: 50, maxPercentage: 60, grade: "C+", gradePoint: 2.4 },
                { minPercentage: 40, maxPercentage: 50, grade: "C", gradePoint: 2 },
                { minPercentage: 35, maxPercentage: 40, grade: "D", gradePoint: 1.6 },
                { minPercentage: 0, maxPercentage: 35, grade: "NG", gradePoint: 0 },
              ],
            },
          },
          include: { entries: true },
        });

        const teacherNames = [
          ["Mina", "QA-Teacher-01"],
          ["Bikash", "QA-Teacher-02"],
          ["Laxmi", "QA-Teacher-03"],
          ["Suman", "QA-Teacher-04"],
          ["Anita", "QA-Teacher-05"],
        ] as const;
        await tx.teacher.createMany({
          data: teacherNames.map(([firstName, code], index) => ({
            schoolId: school.id,
            firstName,
            lastName: `Fictional ${code}`,
            email: `teacher.${index + 1}@example.test`,
            position: "Teacher",
            joiningDate: bsToDate(2083, 1, 5 + index),
            basicSalary: 30000 + index * 1000,
          })),
        });
        const teachers = await tx.teacher.findMany({
          where: { schoolId: school.id },
          orderBy: { email: "asc" },
        });
        await tx.teacherAssignment.createMany({
          data: classes.flatMap((schoolClass, classIndex) =>
            subjects.map((subject, subjectIndex) => ({
              teacherId: teachers[(classIndex + subjectIndex) % teachers.length].id,
              classId: schoolClass.id,
              subjectId: subject.id,
              academicYearId: year83.id,
            })),
          ),
        });

        const givenNames = [
          "Aarav", "Sita", "Rohan", "Priya", "Nabin", "Maya", "Kiran", "Anisha",
          "Bimal", "Nisha", "Sanjay", "Sarita", "Milan", "Sabina", "Prakash",
          "Ritu", "Asha", "Niraj", "Kabita", "Roshan", "Puja", "Deepak",
          "Sunita", "Bikram", "Samir", "Alina", "Sujan", "Rachana", "Nima",
          "Suman", "Tara", "Anil",
        ];
        const familyNames = [
          "Sharma", "Thapa", "Gurung", "Rai", "Karki", "Tamang", "Lama", "KC",
        ];
        const studentRows = classes.flatMap((schoolClass, classIndex) => {
          const count = schoolClass.name === "Grade 5" ? 8 : 2;
          return Array.from({ length: count }, (_, studentIndex) => {
            const totalStudents = classNames.length * 2 + 6;
            const globalIndex = totalStudents -
              classes.slice(classIndex + 1).reduce(
                (remaining, followingClass) =>
                  remaining + (followingClass.name === "Grade 5" ? 8 : 2),
                0,
              ) - count + studentIndex;
            const sequence = studentRowsSequence(classIndex, studentIndex);
            return {
              schoolId: school.id,
              admissionNumber: `QA83-C${String(classIndex + 1).padStart(2, "0")}-${String(studentIndex + 1).padStart(2, "0")}`,
              firstName: givenNames[sequence % givenNames.length],
              lastName: familyNames[sequence % familyNames.length],
              gender: sequence % 2 === 0 ? "Female" : "Male",
              email: `student.${String(globalIndex + 1).padStart(3, "0")}@example.test`,
              address: "Fictional QA address, Pokhara",
              guardianName: `QA Guardian ${String(globalIndex + 1).padStart(3, "0")}`,
              guardianPhone: null,
              dateOfBirth: bsToDate(2074 + (sequence % 4), 2 + (sequence % 8), 4 + (sequence % 20)),
            };
          });
        });
        await tx.student.createMany({ data: studentRows });
        const students = await tx.student.findMany({
          where: { schoolId: school.id },
          orderBy: { admissionNumber: "asc" },
        });
        const classByName = new Map(classes.map((item) => [item.name, item]));
        const studentByAdmission = new Map(
          students.map((student) => [student.admissionNumber, student]),
        );
        const enrollments = studentRows.flatMap((row, index) => {
          const classOrder = Number(row.admissionNumber.match(/C(\d+)/)?.[1]) - 1;
          const schoolClass = classes[classOrder];
          const firstYearClass = schoolClass;
          const nextYearClass =
            schoolClass.name === "Grade 5" && row.admissionNumber.endsWith("-08")
              ? classByName.get("Grade 6")!
              : schoolClass;
          const student = studentByAdmission.get(row.admissionNumber)!;
          const joiningDate =
            index % 4 === 0 ? bsToDate(2083, 1, 10) : bsToDate(2083, 4, 1);
          return [
            {
              studentId: student.id,
              academicYearId: year83.id,
              classId: firstYearClass.id,
              rollNumber: index + 1,
              createdAt: joiningDate,
              updatedAt: joiningDate,
            },
            {
              studentId: student.id,
              academicYearId: year84.id,
              classId: nextYearClass.id,
              rollNumber: index + 1,
            },
          ];
        });
        await tx.enrollment.createMany({ data: enrollments });

        const feeStructures = classes.flatMap((schoolClass, index) => [
          {
            academicYearId: year83.id,
            classId: schoolClass.id,
            feeType: "TUITION" as const,
            name: "Monthly Tuition",
            amount: 8000 + index * 250,
            frequency: "MONTHLY" as const,
          },
          {
            academicYearId: year83.id,
            classId: schoolClass.id,
            feeType: "ADMISSION" as const,
            name: "Annual Admission",
            amount: 2500 + index * 100,
            frequency: "ANNUAL" as const,
          },
          {
            academicYearId: year83.id,
            classId: schoolClass.id,
            feeType: "EXAM" as const,
            name: "Term Examination",
            amount: 800,
            frequency: "TERM" as const,
          },
          {
            academicYearId: year83.id,
            classId: schoolClass.id,
            feeType: "COMPUTER_LAB" as const,
            name: "Computer Lab",
            amount: 400,
            frequency: "MONTHLY" as const,
          },
          {
            academicYearId: year84.id,
            classId: schoolClass.id,
            feeType: "TUITION" as const,
            name: "Monthly Tuition",
            amount: 8500 + index * 250,
            frequency: "MONTHLY" as const,
          },
        ]);
        await tx.feeStructure.createMany({ data: feeStructures });

        const grade5 = classByName.get("Grade 5")!;
        const grade5Students = students
          .filter((student) => student.admissionNumber.startsWith("QA83-C09-"))
          .sort((left, right) =>
            left.admissionNumber.localeCompare(right.admissionNumber),
          );
        const chargeRows = [
          {
            studentId: grade5Students[0].id,
            academicYearId: year83.id,
            description: "QA monthly bus",
            quantity: 1,
            rate: 1200,
            amount: 1200,
            feeType: "BUS" as const,
            frequency: "MONTHLY" as const,
            startDate: bsToDate(2083, 1, 1),
            endDate: null,
            notes: "Fictional recurring transport charge.",
          },
          {
            studentId: grade5Students[1].id,
            academicYearId: year83.id,
            description: "QA term bus",
            quantity: 1,
            rate: 900,
            amount: 900,
            feeType: "BUS" as const,
            frequency: "TERM" as const,
            startDate: bsToDate(2083, 4, 1),
            endDate: null,
            notes: "Fictional term transport charge.",
          },
          {
            studentId: grade5Students[2].id,
            academicYearId: year83.id,
            description: "QA annual activity charge",
            quantity: 1,
            rate: 1500,
            amount: 1500,
            feeType: "MISCELLANEOUS" as const,
            frequency: "ANNUAL" as const,
            startDate: bsToDate(2083, 1, 1),
            endDate: null,
            notes: "Fictional annual activity charge.",
          },
          {
            studentId: grade5Students[3].id,
            academicYearId: year83.id,
            description: "QA one-time materials charge",
            quantity: 1,
            rate: 650,
            amount: 650,
            feeType: "MISCELLANEOUS" as const,
            frequency: "ONE_TIME" as const,
            startDate: bsToDate(2083, 7, 1),
            endDate: null,
            notes: "Fictional one-time materials charge.",
          },
        ];
        await tx.studentCharge.createMany({ data: chargeRows });

        const discountRows = [grade5Students[4], grade5Students[5]].map(
          (student, index) => ({
            studentId: student.id,
            academicYearId: year83.id,
            name: `QA tuition discount ${index + 1}`,
            isActive: true,
            percentage: index === 0 ? 10 : 15,
            startDate: bsToDate(2083, index === 0 ? 1 : 4, 1),
            endDate: index === 0 ? null : bsToDate(2083, 6, 30),
            notes: "Fictional QA discount.",
          }),
        );
        await tx.studentDiscount.createMany({ data: discountRows });
        const discounts = await tx.studentDiscount.findMany({
          where: { studentId: { in: [grade5Students[4].id, grade5Students[5].id] } },
          orderBy: { name: "asc" },
        });
        await tx.studentDiscountFee.createMany({
          data: discounts.flatMap((discount, index) => [
            { discountId: discount.id, feeType: "TUITION" as const },
            ...(index === 1
              ? [{ discountId: discount.id, feeType: "COMPUTER_LAB" as const }]
              : []),
          ]),
        });
        await tx.studentCredit.create({
          data: {
            studentId: grade5Students[6].id,
            academicYearId: year83.id,
            amount: 500,
            appliedAmount: 0,
            source: "Fictional QA test credit",
            notes: "Seeded available credit for application-path verification.",
          },
        });

        await tx.infrastructure.createMany({
          data: [
            { schoolId: school.id, name: "QA Library", description: "Fictional test facility." },
            { schoolId: school.id, name: "QA Computer Lab", description: "Fictional test facility." },
          ],
        });

        const terms = await tx.academicTerm.findMany({
          where: { academicYearId: year83.id },
          orderBy: { order: "asc" },
        });
        const examRows = [
          ...terms.map((term) => ({
            termId: term.id,
            classId: grade5.id,
            name:
              term.order === 1
                ? "Grade 5 Boundary Examination"
                : `Grade 5 ${term.name} Examination`,
            isPublished: false,
            isLocked: false,
          })),
          {
            termId: terms[0].id,
            classId: classByName.get("Grade 8")!.id,
            name: "Grade 8 Term 1 Examination",
            isPublished: false,
            isLocked: false,
          },
        ];
        await tx.exam.createMany({ data: examRows });
        const exams = await tx.exam.findMany({
          where: {
            termId: { in: terms.map((term) => term.id) },
            classId: { in: [grade5.id, classByName.get("Grade 8")!.id] },
          },
          include: { class: true, term: true },
        });
        const examSubjects = exams.flatMap((exam) =>
          subjects.map((subject, subjectIndex) => ({
            examId: exam.id,
            subjectId: subject.id,
            theoryFullMarks: subjectIndex < 2 ? 100 : 80,
            practicalFullMarks: subjectIndex < 2 ? 0 : 20,
          })),
        );
        await tx.examSubject.createMany({ data: examSubjects });
        const savedExamSubjects = await tx.examSubject.findMany({
          where: { examId: { in: exams.map((exam) => exam.id) } },
          include: { exam: { include: { class: true, term: true } }, subject: true },
        });
        const markRows = savedExamSubjects.flatMap((examSubject) => {
          const exam = examSubject.exam;
          const examStudents =
            exam.class.name === "Grade 5"
              ? grade5Students
              : students.filter((student) =>
                  student.admissionNumber.startsWith("QA83-C12-"),
                );
          return examStudents.map((student, studentIndex) => {
            const subjectIndex = subjects.findIndex(
              (subject) => subject.id === examSubject.subjectId,
            );
            let theoryMarks: number;
            let practicalMarks: number;
            if (
              exam.class.name === "Grade 5" &&
              exam.term.order === 1 &&
              subjectIndex < 2
            ) {
              theoryMarks =
                boundaryPercentages[studentIndex * 2 + subjectIndex];
              practicalMarks = 0;
            } else if (subjectIndex < 2) {
              const termScores = [95, 85, 75, 65, 55, 45, 38, 20];
              theoryMarks = termScores[(studentIndex + exam.term.order - 1) % termScores.length];
              practicalMarks = 0;
            } else {
              theoryMarks = 52 + ((studentIndex + subjectIndex) % 25);
              practicalMarks = 12 + ((studentIndex + subjectIndex) % 8);
            }
            return {
              examSubjectId: examSubject.id,
              studentId: student.id,
              theoryMarks,
              practicalMarks,
            };
          });
        });
        await tx.mark.createMany({ data: markRows });

        const migrationCheck = await tx.$queryRaw<
          { migrationCount: bigint }[]
        >`
          SELECT COUNT(*) FILTER (
            WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
          ) AS "migrationCount"
          FROM "_prisma_migrations"
        `;
        if (Number(migrationCheck[0]?.migrationCount) !== 15) {
          throw new Error("Prisma migration history changed during QA reset.");
        }

        const [studentCount, teacherCount, examCount, markCount, sectionCount] =
          await Promise.all([
            tx.student.count(),
            tx.teacher.count(),
            tx.exam.count(),
            tx.mark.count(),
            tx.section.count(),
          ]);
        if (
          students.length !== 30 ||
          teacherCount !== 5 ||
          examCount !== 5 ||
          markCount !== 170 ||
          sectionCount !== 0 ||
          studentCount !== 30 ||
          gradeScale.entries.length !== 8
        ) {
          throw new Error("Fresh QA data failed the expected consistency checks.");
        }

        return {
          schoolId: school.id,
          academicYearIds: [year83.id, year84.id],
          students: studentCount,
          teachers: teacherCount,
          classes: classes.length,
          subjects: subjects.length,
          exams: examCount,
          marks: markCount,
          gradeEntries: gradeScale.entries.length,
          sections: sectionCount,
        };
      },
      { maxWait: 15000, timeout: 120000 },
    );

    console.log(JSON.stringify(seededCounts, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function studentRowsSequence(classIndex: number, studentIndex: number) {
  return classIndex * 2 + studentIndex + (classIndex > 8 ? 6 : 0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "QA reset failed.");
  process.exitCode = 1;
});
