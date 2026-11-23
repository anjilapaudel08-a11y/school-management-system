import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
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
  { name: "Computer Studies", code: "COMP" },
];
const teacherData = [
  ["Mina", "Shrestha"],
  ["Bikash", "Gurung"],
  ["Laxmi", "Thapa"],
  ["Suman", "Rai"],
  ["Anita", "Karki"],
  ["Kiran", "Tamang"],
  ["Puja", "Lama"],
  ["Nabin", "KC"],
] as const;
const firstNames = [
  "Aarav", "Sita", "Rohan", "Priya", "Nabin", "Maya", "Kiran", "Anisha",
  "Bimal", "Nisha", "Sanjay", "Sarita", "Milan", "Sabina", "Prakash",
  "Ritu", "Asha", "Niraj", "Kabita", "Roshan",
];
const familyNames = [
  "Sharma",
  "Thapa",
  "Gurung",
  "Rai",
  "Karki",
  "Tamang",
  "Lama",
  "KC",
];
const percentageBands = [98, 85, 72, 64, 54, 44, 28, 0];
const gradeBoundaryPercentages = [
  0, 34.99, 35, 39.99, 40, 49.99, 50, 59.99,
  60, 69.99, 70, 79.99, 80, 89.99, 90, 100,
];

type FeeType =
  | "TUITION"
  | "ADMISSION"
  | "BUS"
  | "COMPUTER_LAB"
  | "EXAM"
  | "MISCELLANEOUS";

type StudentPlan = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  address: string;
  guardianName: string;
  dateOfBirth: Date;
  createdAt: Date;
  classIndex: number;
  localIndex: number;
  returning: boolean;
  globalIndex: number;
};

type DiscountSeed = {
  studentIndex: number;
  yearIndex: 0 | 1;
  name: string;
  percentage: number;
  isActive: boolean;
  startDate: Date;
  endDate: Date | null;
  feeTypes: FeeType[];
};

type ChargeSeed = {
  studentIndex: number;
  yearIndex: 0 | 1;
  description: string;
  quantity: number;
  rate: number;
  feeType: "BUS" | "MISCELLANEOUS";
  frequency: "MONTHLY" | "TERM" | "ANNUAL" | "ONE_TIME";
  startMonth: number;
  endMonth: number | null;
};

function assertTarget(connectionString: string) {
  let target: URL;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("Refusing reset: DATABASE_URL is not a valid URL.");
  }
  const database = decodeURIComponent(target.pathname.replace(/^\//, ""));
  if (
    target.hostname !== approvedHost ||
    database !== approvedDatabase ||
    process.env.QA_RESET_EXPECTED_HOST !== approvedHost ||
    process.env.QA_RESET_EXPECTED_DATABASE !== approvedDatabase
  ) {
    throw new Error(
      "Refusing to reset a database outside the exact approved QA target.",
    );
  }
}

function dayBefore(date: Date) {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (process.env.QA_RESET_CONFIRMATION !== "RESET_ISOLATED_QA_DATABASE") {
    throw new Error(
      "Set QA_RESET_CONFIRMATION=RESET_ISOLATED_QA_DATABASE to authorize this QA-only reset.",
    );
  }
  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }
  assertTarget(connectionString);

  const adminEmail = "qa.accountant@example.test";
  const adminPassword = randomBytes(24).toString("hex");
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const databaseInfo = await prisma.$queryRaw<
      { database: string; migrationTotal: bigint; migrationApplied: bigint }[]
    >`
      SELECT current_database() AS database,
             COUNT(*) AS "migrationTotal",
             COUNT(*) FILTER (
               WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
             ) AS "migrationApplied"
      FROM "_prisma_migrations"
    `;
    if (databaseInfo[0]?.database !== approvedDatabase) {
      throw new Error(
        "Connected database does not match the authorized QA database.",
      );
    }

    const existingTables = await prisma.$queryRaw<
      { table_name: string }[]
    >`
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

    const beforeResetCounts: Record<string, number> = {};
    for (const table of applicationTables) {
      const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) AS count FROM public."${table}"`,
      );
      beforeResetCounts[table] = Number(rows[0]?.count ?? 0);
    }

    const truncate = `TRUNCATE TABLE ${applicationTables
      .map((table) => `public."${table}"`)
      .join(", ")} RESTART IDENTITY`;
    const resetCounts = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRawUnsafe(truncate);

        const zeroCounts: Record<string, number> = {};
        for (const table of applicationTables) {
          const rows = await tx.$queryRawUnsafe<{ count: bigint }[]>(
            `SELECT COUNT(*) AS count FROM public."${table}"`,
          );
          zeroCounts[table] = Number(rows[0]?.count ?? 0);
        }
        if (Object.values(zeroCounts).some((count) => count !== 0)) {
          throw new Error("Application tables were not empty after reset.");
        }

        const school = await tx.school.create({
          data: {
            name: "QA Academy - Fictional Test School",
            shortName: "QA-A",
            address: "Fictional QA address, Pokhara",
            email: "office@example.test",
            establishedYear: 2075,
            description: "Synthetic records for isolated application QA.",
          },
        });
        const admin = await tx.user.create({
          data: {
            name: "QA Accountant",
            email: adminEmail,
            password: adminPasswordHash,
            role: "ADMIN",
          },
        });

        const year2083 = await tx.academicYear.create({
          data: {
            schoolId: school.id,
            name: "2083",
            startDate: bsToDate(2083, 1, 1),
            endDate: bsToDate(2083, 12, 30),
            isActive: true,
          },
        });
        const year2084 = await tx.academicYear.create({
          data: {
            schoolId: school.id,
            name: "2084",
            startDate: bsToDate(2084, 1, 1),
            endDate: bsToDate(2084, 12, 30),
            isActive: false,
          },
        });
        const years = [year2083, year2084];
        await tx.academicTerm.createMany({
          data: years.flatMap((year) =>
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
        await tx.section.createMany({
          data: ["A", "B", "C", "D"].map((name) => ({
            schoolId: school.id,
            name,
          })),
        });
        await tx.subject.createMany({ data: subjectData });
        const classes = await tx.class.findMany({
          where: { schoolId: school.id },
          orderBy: { order: "asc" },
        });
        const sections = await tx.section.findMany({
          where: { schoolId: school.id },
          orderBy: { name: "asc" },
        });
        const subjects = await tx.subject.findMany({
          orderBy: { code: "asc" },
        });
        const yearByName = new Map(years.map((year) => [year.name, year]));
        await tx.classSubject.createMany({
          data: years.flatMap((year) =>
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
            name: "QA Eight-Grade Percentage Scale",
            description: "Synthetic scale for grade-boundary regression tests.",
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
        });

        await tx.teacher.createMany({
          data: teacherData.map(([firstName, lastName], index) => ({
            schoolId: school.id,
            firstName,
            lastName,
            gender: index % 2 === 0 ? "Female" : "Male",
            email: `teacher.${String(index + 1).padStart(2, "0")}@example.test`,
            position: "Teacher",
            joiningDate: bsToDate(2082, index + 1, 15),
            basicSalary: 30000 + index * 2500,
            address: "Fictional QA address, Pokhara",
          })),
        });
        const teachers = await tx.teacher.findMany({
          where: { schoolId: school.id },
          orderBy: { email: "asc" },
        });
        await tx.teacherAssignment.createMany({
          data: years.flatMap((year, yearIndex) =>
            classes.flatMap((schoolClass, classIndex) =>
              subjects.map((subject, subjectIndex) => ({
                teacherId:
                  teachers[
                    (classIndex + subjectIndex + yearIndex) % teachers.length
                  ].id,
                classId: schoolClass.id,
                subjectId: subject.id,
                academicYearId: year.id,
              })),
            ),
          ),
        });

        const studentPlans: StudentPlan[] = classes.flatMap(
          (schoolClass, classIndex) => {
            const count = schoolClass.name === "Grade 5" ? 8 : 4;
            return Array.from({ length: count }, (_, localIndex) => {
              const globalIndex =
                classes
                  .slice(0, classIndex)
                  .reduce(
                    (total, previous) =>
                      total + (previous.name === "Grade 5" ? 8 : 4),
                    0,
                  ) + localIndex;
              return {
                admissionNumber: `QA83-C${String(classIndex + 1).padStart(2, "0")}-${String(localIndex + 1).padStart(2, "0")}`,
                firstName: firstNames[globalIndex % firstNames.length],
                lastName:
                  familyNames[
                    Math.floor(globalIndex / firstNames.length) %
                      familyNames.length
                  ],
                gender: globalIndex % 2 === 0 ? "Female" : "Male",
                email: `student.${String(globalIndex + 1).padStart(3, "0")}@example.test`,
                address: "Fictional QA address, Pokhara",
                guardianName: `QA Guardian ${String(globalIndex + 1).padStart(3, "0")}`,
                dateOfBirth: bsToDate(
                  2069 + (globalIndex % 6),
                  (globalIndex % 12) + 1,
                  15,
                ),
                createdAt: bsToDate(
                  2082 + (globalIndex % 2),
                  (globalIndex % 12) + 1,
                  15,
                ),
                classIndex,
                localIndex,
                returning: localIndex !== 0,
                globalIndex,
              };
            });
          },
        );
        await tx.student.createMany({
          data: studentPlans.map((plan) => ({
            schoolId: school.id,
            admissionNumber: plan.admissionNumber,
            firstName: plan.firstName,
            lastName: plan.lastName,
            gender: plan.gender,
            email: plan.email,
            address: plan.address,
            guardianName: plan.guardianName,
            dateOfBirth: plan.dateOfBirth,
            createdAt: plan.createdAt,
            updatedAt: plan.createdAt,
          })),
        });
        const students = await tx.student.findMany({
          where: { schoolId: school.id },
          orderBy: { admissionNumber: "asc" },
        });
        const studentByAdmission = new Map(
          students.map((student) => [student.admissionNumber, student]),
        );
        const year83 = yearByName.get("2083");
        const year84 = yearByName.get("2084");
        if (!year83 || !year84) {
          throw new Error("Expected academic years were not created.");
        }
        const enrollmentRows = studentPlans.flatMap((plan) => {
          const student = studentByAdmission.get(plan.admissionNumber);
          if (!student) {
            throw new Error(`Missing seeded student ${plan.admissionNumber}.`);
          }
          const currentClass = classes[plan.classIndex];
          const nextClassIndex =
            plan.localIndex ===
              (currentClass.name === "Grade 5" ? 7 : 3) &&
            plan.classIndex < classes.length - 1
              ? plan.classIndex + 1
              : plan.classIndex;
          const firstYearDate = bsToDate(
            2083,
            (plan.globalIndex % 12) + 1,
            15,
          );
          const firstYearEnrollment = {
            studentId: student.id,
            academicYearId: year83.id,
            classId: currentClass.id,
            sectionId: sections[plan.globalIndex % sections.length].id,
            rollNumber: plan.localIndex + 1,
            createdAt: firstYearDate,
            updatedAt: firstYearDate,
          };
          if (!plan.returning) return [firstYearEnrollment];
          return [
            firstYearEnrollment,
            {
              studentId: student.id,
              academicYearId: year84.id,
              classId: classes[nextClassIndex].id,
              sectionId:
                sections[(plan.globalIndex + 1) % sections.length].id,
              rollNumber: plan.localIndex + 1,
            },
          ];
        });
        await tx.enrollment.createMany({ data: enrollmentRows });

        const feeDefinitions = [
          { feeType: "TUITION", name: "Monthly Tuition", frequency: "MONTHLY", base: 8000 },
          { feeType: "ADMISSION", name: "Annual Admission", frequency: "ANNUAL", base: 2500 },
          { feeType: "EXAM", name: "Term Examination", frequency: "TERM", base: 850 },
          { feeType: "MISCELLANEOUS", name: "One-Time Activities", frequency: "ONE_TIME", base: 1250 },
          { feeType: "COMPUTER_LAB", name: "Computer Lab", frequency: "MONTHLY", base: 450 },
        ] as const;
        const feeRows = years.flatMap((year, yearIndex) =>
          classes.flatMap((schoolClass, classIndex) =>
            feeDefinitions
              .filter(
                (fee) =>
                  fee.feeType !== "COMPUTER_LAB" || classIndex >= 2,
              )
              .map((fee, feeIndex) => ({
                academicYearId: year.id,
                classId: schoolClass.id,
                feeType: fee.feeType,
                name: fee.name,
                amount: Number(
                  (
                    fee.base +
                    classIndex * (feeIndex === 0 ? 375 : 125) +
                    yearIndex * 500 +
                    (classIndex % 3 === 0 ? 0.5 : 0)
                  ).toFixed(2),
                ),
                frequency: fee.frequency,
                isActive: !(
                  fee.feeType === "MISCELLANEOUS" &&
                  classIndex % 4 === 0
                ),
              })),
          ),
        );
        await tx.feeStructure.createMany({ data: feeRows });

        const chargeSeeds: ChargeSeed[] = [
          { studentIndex: 1, yearIndex: 0, description: "QA monthly bus A", quantity: 1, rate: 1250, feeType: "BUS", frequency: "MONTHLY", startMonth: 1, endMonth: null },
          { studentIndex: 2, yearIndex: 0, description: "QA monthly bus family", quantity: 2, rate: 875, feeType: "BUS", frequency: "MONTHLY", startMonth: 1, endMonth: null },
          { studentIndex: 5, yearIndex: 0, description: "QA term bus", quantity: 1, rate: 2950, feeType: "BUS", frequency: "TERM", startMonth: 4, endMonth: null },
          { studentIndex: 7, yearIndex: 0, description: "QA annual bus", quantity: 1, rate: 7800, feeType: "BUS", frequency: "ANNUAL", startMonth: 1, endMonth: null },
          { studentIndex: 9, yearIndex: 0, description: "QA one-time bus", quantity: 1, rate: 2400, feeType: "BUS", frequency: "ONE_TIME", startMonth: 7, endMonth: null },
          { studentIndex: 12, yearIndex: 0, description: "QA term miscellaneous", quantity: 2, rate: 375, feeType: "MISCELLANEOUS", frequency: "TERM", startMonth: 3, endMonth: null },
          { studentIndex: 15, yearIndex: 0, description: "QA monthly activity materials", quantity: 1, rate: 550, feeType: "MISCELLANEOUS", frequency: "MONTHLY", startMonth: 2, endMonth: 10 },
          { studentIndex: 18, yearIndex: 0, description: "QA annual activity", quantity: 1, rate: 1750, feeType: "MISCELLANEOUS", frequency: "ANNUAL", startMonth: 1, endMonth: null },
          { studentIndex: 21, yearIndex: 0, description: "QA one-time materials quantity", quantity: 3, rate: 225.5, feeType: "MISCELLANEOUS", frequency: "ONE_TIME", startMonth: 8, endMonth: null },
          { studentIndex: 24, yearIndex: 0, description: "QA late-start monthly bus", quantity: 1, rate: 1400, feeType: "BUS", frequency: "MONTHLY", startMonth: 6, endMonth: 11 },
          { studentIndex: 27, yearIndex: 0, description: "QA capped term bus", quantity: 2, rate: 625.25, feeType: "BUS", frequency: "TERM", startMonth: 2, endMonth: 9 },
          { studentIndex: 30, yearIndex: 1, description: "QA year-two monthly bus", quantity: 1, rate: 1450, feeType: "BUS", frequency: "MONTHLY", startMonth: 2, endMonth: null },
          { studentIndex: 35, yearIndex: 1, description: "QA year-two one-time materials", quantity: 1, rate: 990.5, feeType: "MISCELLANEOUS", frequency: "ONE_TIME", startMonth: 5, endMonth: null },
          { studentIndex: 45, yearIndex: 1, description: "QA year-two annual bus", quantity: 2, rate: 3200, feeType: "BUS", frequency: "ANNUAL", startMonth: 1, endMonth: null },
        ];
        const chargeRows = chargeSeeds.map((seed) => ({
          studentId: students[seed.studentIndex].id,
          academicYearId: years[seed.yearIndex].id,
          description: seed.description,
          quantity: seed.quantity,
          rate: seed.rate,
          amount: Number((seed.quantity * seed.rate).toFixed(2)),
          feeType: seed.feeType,
          frequency: seed.frequency,
          startDate: bsToDate(
            seed.yearIndex === 0 ? 2083 : 2084,
            seed.startMonth,
            15,
          ),
          endDate: seed.endMonth
            ? dayBefore(
                bsToDate(
                  seed.yearIndex === 0 ? 2083 : 2084,
                  seed.endMonth + 1,
                  1,
                ),
              )
            : null,
          notes: "Fictional QA-only student charge.",
        }));
        await tx.studentCharge.createMany({ data: chargeRows });

        const adjacentRangeEnd = dayBefore(bsToDate(2083, 4, 1));
        const discountSeeds: DiscountSeed[] = [
          { studentIndex: 0, yearIndex: 0, name: "QA full tuition scholarship", percentage: 100, isActive: true, startDate: bsToDate(2083, 1, 1), endDate: null, feeTypes: ["TUITION"] },
          { studentIndex: 1, yearIndex: 0, name: "QA partial tuition support", percentage: 12.5, isActive: true, startDate: bsToDate(2082, 12, 15), endDate: null, feeTypes: ["TUITION"] },
          { studentIndex: 2, yearIndex: 0, name: "QA tuition and admission support", percentage: 20, isActive: true, startDate: bsToDate(2083, 1, 1), endDate: null, feeTypes: ["TUITION", "ADMISSION"] },
          { studentIndex: 3, yearIndex: 0, name: "QA lab support", percentage: 15, isActive: true, startDate: bsToDate(2083, 2, 1), endDate: null, feeTypes: ["COMPUTER_LAB"] },
          { studentIndex: 4, yearIndex: 0, name: "QA first adjacent tuition period", percentage: 10, isActive: true, startDate: bsToDate(2083, 1, 1), endDate: adjacentRangeEnd, feeTypes: ["TUITION"] },
          { studentIndex: 4, yearIndex: 0, name: "QA second adjacent tuition period", percentage: 10, isActive: true, startDate: bsToDate(2083, 4, 1), endDate: null, feeTypes: ["TUITION"] },
          { studentIndex: 5, yearIndex: 0, name: "QA expired exam support", percentage: 25, isActive: true, startDate: bsToDate(2082, 1, 1), endDate: bsToDate(2082, 12, 15), feeTypes: ["EXAM"] },
          { studentIndex: 6, yearIndex: 0, name: "QA inactive family support", percentage: 30, isActive: false, startDate: bsToDate(2083, 1, 1), endDate: null, feeTypes: ["TUITION", "MISCELLANEOUS"] },
          { studentIndex: 7, yearIndex: 0, name: "QA multi-fee support", percentage: 7.5, isActive: true, startDate: bsToDate(2083, 3, 1), endDate: bsToDate(2083, 9, 15), feeTypes: ["TUITION", "COMPUTER_LAB"] },
          { studentIndex: 20, yearIndex: 0, name: "QA boundary-date support", percentage: 5, isActive: true, startDate: bsToDate(2083, 1, 1), endDate: dayBefore(bsToDate(2083, 4, 1)), feeTypes: ["ADMISSION", "EXAM"] },
          { studentIndex: 30, yearIndex: 1, name: "QA year-two tuition support", percentage: 8, isActive: true, startDate: bsToDate(2084, 1, 1), endDate: null, feeTypes: ["TUITION"] },
          { studentIndex: 35, yearIndex: 1, name: "QA year-two lab support", percentage: 12, isActive: true, startDate: bsToDate(2084, 2, 1), endDate: bsToDate(2084, 8, 15), feeTypes: ["COMPUTER_LAB"] },
        ];
        for (const seed of discountSeeds) {
          await tx.studentDiscount.create({
            data: {
              studentId: students[seed.studentIndex].id,
              academicYearId: years[seed.yearIndex].id,
              name: seed.name,
              percentage: seed.percentage,
              isActive: seed.isActive,
              startDate: seed.startDate,
              endDate: seed.endDate,
              notes: "Fictional QA-only discount.",
              feeTypes: {
                create: seed.feeTypes.map((feeType) => ({ feeType })),
              },
            },
          });
        }

        const creditIssueDate = bsToDate(2083, 3, 15);
        const creditReason = "Approved fictional QA fee correction";
        const creditNotes =
          "Auditable QA credit; available for application tests.";
        const issuanceIdempotencyKey = "QA-FRESH-CREDIT-ISSUE-001";
        const issuanceRequestHash = createHash("sha256")
          .update(
            JSON.stringify({
              studentId: students[6].id,
              academicYearId: year83.id,
              amountCents: 75050,
              issueDate: creditIssueDate.toISOString(),
              reason: creditReason,
              notes: creditNotes,
              issuedByUserId: admin.id,
            }),
          )
          .digest("hex");
        await tx.studentCredit.createMany({
          data: [
            {
              studentId: students[6].id,
              academicYearId: year83.id,
              amount: 750.5,
              appliedAmount: 0,
              source: "MANUAL_ADJUSTMENT",
              issueDate: creditIssueDate,
              reason: creditReason,
              notes: creditNotes,
              issuedByUserId: admin.id,
              issuanceIdempotencyKey,
              issuanceRequestHash,
            },
            {
              studentId: students[10].id,
              academicYearId: year83.id,
              amount: 125,
              appliedAmount: 0,
              source: "LEGACY",
              notes: "Synthetic legacy credit with intentionally incomplete audit metadata.",
            },
          ],
        });
        await tx.infrastructure.createMany({
          data: [
            { schoolId: school.id, name: "QA Library", description: "Fictional test facility." },
            { schoolId: school.id, name: "QA Computer Lab", description: "Fictional test facility." },
            { schoolId: school.id, name: "QA School Bus", description: "Fictional test facility." },
          ],
        });

        const terms = await tx.academicTerm.findMany({
          where: { academicYearId: { in: years.map((year) => year.id) } },
          include: { academicYear: true },
          orderBy: [{ academicYear: { name: "asc" } }, { order: "asc" }],
        });
        const examSpecs = years.flatMap((year) =>
          terms
            .filter((term) => term.academicYearId === year.id)
            .flatMap((term) =>
              classes.map((schoolClass) => ({
                termId: term.id,
                classId: schoolClass.id,
                gradeScaleId: gradeScale.id,
                name: `${year.name} ${schoolClass.name} ${term.name} QA Examination`,
                isPublished:
                  year.name === "2083" &&
                  schoolClass.name === "Grade 5" &&
                  term.order === 1,
                isLocked:
                  year.name === "2083" &&
                  schoolClass.name === "Grade 5" &&
                  term.order === 1,
              })),
            )
            .filter(
              (exam) =>
                year.name === "2083" ||
                exam.name.endsWith("Term 1 QA Examination"),
            ),
        );
        await tx.exam.createMany({ data: examSpecs });
        const exams = await tx.exam.findMany({
          where: { termId: { in: terms.map((term) => term.id) } },
          include: {
            class: true,
            term: { include: { academicYear: true } },
          },
        });
        const examSubjects = exams.flatMap((exam) =>
          subjects.map((subject) => {
            const subjectIndex = subjects.findIndex(
              (item) => item.id === subject.id,
            );
            const fullMarks = [
              { theory: 100, practical: 0 },
              { theory: 100, practical: 0 },
              { theory: 80, practical: 20 },
              { theory: 60, practical: 40 },
              { theory: 0, practical: 50 },
            ][subjectIndex];
            return {
              examId: exam.id,
              subjectId: subject.id,
              theoryFullMarks: fullMarks.theory,
              practicalFullMarks: fullMarks.practical,
            };
          }),
        );
        await tx.examSubject.createMany({ data: examSubjects });
        const savedExamSubjects = await tx.examSubject.findMany({
          where: { examId: { in: exams.map((exam) => exam.id) } },
          include: {
            exam: {
              include: {
                class: true,
                term: { include: { academicYear: true } },
              },
            },
            subject: true,
          },
        });
        const enrollments = await tx.enrollment.findMany({
          where: { academicYearId: { in: years.map((year) => year.id) } },
          include: { student: true, class: true, academicYear: true },
          orderBy: [{ academicYear: { name: "asc" } }, { class: { order: "asc" } }, { rollNumber: "asc" }],
        });
        const studentsForClassYear = new Map<string, typeof students>();
        for (const enrollment of enrollments) {
          const key = `${enrollment.academicYearId}:${enrollment.classId}`;
          const existing = studentsForClassYear.get(key) ?? [];
          existing.push(enrollment.student);
          studentsForClassYear.set(key, existing);
        }
        const markRows = savedExamSubjects.flatMap((examSubject) => {
          const exam = examSubject.exam;
          const key = `${exam.term.academicYearId}:${exam.classId}`;
          const classStudents = studentsForClassYear.get(key) ?? [];
          const subjectIndex = subjects.findIndex(
            (subject) => subject.id === examSubject.subjectId,
          );
          return classStudents.flatMap((student, studentIndex) => {
            if (
              exam.term.academicYear.name === "2083" &&
              exam.class.name === "Grade 8" &&
              exam.term.order === 4 &&
              studentIndex === 0 &&
              subjectIndex === 4
            ) {
              return [];
            }
            let percentage =
              percentageBands[
                (studentIndex + subjectIndex + exam.term.order - 1) %
                  percentageBands.length
              ];
            if (
              exam.term.academicYear.name === "2083" &&
              exam.class.name === "Grade 5" &&
              exam.term.order === 1 &&
              subjectIndex < 2
            ) {
              percentage =
                gradeBoundaryPercentages[
                  subjectIndex * 8 + studentIndex
                ];
            }
            if (
              exam.term.academicYear.name === "2083" &&
              exam.class.name === "Grade 6" &&
              exam.term.order === 2 &&
              (studentIndex === 1 || studentIndex === 2)
            ) {
              percentage = 85;
            }
            return [
              {
                examSubjectId: examSubject.id,
                studentId: student.id,
                theoryMarks: Number(
                  (
                    (Number(examSubject.theoryFullMarks) * percentage) /
                    100
                  ).toFixed(2),
                ),
                practicalMarks: Number(
                  (
                    (Number(examSubject.practicalFullMarks) * percentage) /
                    100
                  ).toFixed(2),
                ),
              },
            ];
          });
        });
        await tx.mark.createMany({ data: markRows });

        const salaryRows = teachers.flatMap((teacher, teacherIndex) => {
          const salaryAmount = Number(teacher.basicSalary);
          const deduction = 500 + teacherIndex * 75;
          const netAmount = salaryAmount - deduction;
          return [
            { teacher, teacherIndex, year: 2083, month: 1, status: "PENDING" as const, salaryAmount, deduction, netAmount, paymentFraction: 0 },
            { teacher, teacherIndex, year: 2083, month: 2, status: "PARTIAL" as const, salaryAmount, deduction, netAmount, paymentFraction: 0.4 },
            { teacher, teacherIndex, year: 2083, month: 3, status: "PAID" as const, salaryAmount, deduction, netAmount, paymentFraction: 1 },
            { teacher, teacherIndex, year: 2083, month: 4, status: "PENDING" as const, salaryAmount, deduction, netAmount, paymentFraction: 0 },
            { teacher, teacherIndex, year: 2084, month: 1, status: "PENDING" as const, salaryAmount: salaryAmount + 1000, deduction, netAmount: salaryAmount + 1000 - deduction, paymentFraction: 0 },
          ];
        });
        await tx.teacherSalary.createMany({
          data: salaryRows.map((row) => ({
            teacherId: row.teacher.id,
            academicYearId: years[row.year === 2083 ? 0 : 1].id,
            month: row.month,
            year: row.year,
            salaryAmount: row.salaryAmount,
            deduction: row.deduction,
            netAmount: row.netAmount,
            status: row.status,
            paymentDate:
              row.paymentFraction > 0
                ? bsToDate(row.year, row.month, 15)
                : null,
            paymentMethod: row.teacherIndex % 2 === 0 ? "BANK" : "CASH",
            reference:
              row.paymentFraction > 0
                ? `QA-SALARY-${row.year}-${row.month}-${row.teacherIndex + 1}`
                : null,
            notes: "Fictional QA salary record.",
          })),
        });
        const savedSalaries = await tx.teacherSalary.findMany({
          where: {
            teacherId: { in: teachers.map((teacher) => teacher.id) },
          },
        });
        const salaryByKey = new Map(
          savedSalaries.map((salary) => [
            `${salary.teacherId}:${salary.year}:${salary.month}`,
            salary,
          ]),
        );
        const salaryPaymentRows = salaryRows.flatMap((row) => {
          if (row.paymentFraction === 0) return [];
          const salary = salaryByKey.get(
            `${row.teacher.id}:${row.year}:${row.month}`,
          );
          if (!salary) {
            throw new Error("A seeded salary record could not be located.");
          }
          return [
            {
              teacherSalaryId: salary.id,
              amount: Number((row.netAmount * row.paymentFraction).toFixed(2)),
              paymentDate: bsToDate(row.year, row.month, 15),
              method: row.teacherIndex % 2 === 0 ? "BANK" as const : "CASH" as const,
              reference: `QA-SALARY-PAY-${row.year}-${row.month}-${row.teacherIndex + 1}`,
              notes: "Fictional QA salary payment.",
            },
          ];
        });
        await tx.teacherSalaryPayment.createMany({
          data: salaryPaymentRows,
        });

        const expenseSeeds = [
          ["OFFICE_SUPPLIES", "Fictional classroom supplies", 1250.75, 2083, 1],
          ["ELECTRICITY", "Fictional electricity bill", 8950, 2083, 2],
          ["WATER", "Fictional water service", 675.5, 2083, 3],
          ["INTERNET", "Fictional internet service", 1800, 2083, 4],
          ["MAINTENANCE", "Fictional building repair", 12750.25, 2083, 5],
          ["TRANSPORT", "Fictional bus servicing", 5400, 2083, 6],
          ["MEDICAL", "Fictional first-aid supplies", 950.5, 2083, 7],
          ["FOOD", "Fictional staff refreshments", 2250, 2083, 8],
          ["RENT", "Fictional equipment rental", 3000, 2084, 1],
          ["OTHER", "Fictional QA expense", 44.75, 2084, 2],
        ] as const;
        await tx.expense.createMany({
          data: expenseSeeds.map(
            ([category, description, amount, year, month], index) => ({
              academicYearId: years[year === 2083 ? 0 : 1].id,
              category,
              description,
              amount,
              expenseDate: bsToDate(year, month, 7 + index),
              paidTo: `Fictional QA Vendor ${index + 1}`,
              paymentMethod: index % 2 === 0 ? "BANK" : "CASH",
              reference: `QA-EXP-${String(index + 1).padStart(2, "0")}`,
              notes: "Synthetic expense for QA.",
            }),
          ),
        });

        const migrationCheck = await tx.$queryRaw<
          { migrationTotal: bigint; migrationApplied: bigint }[]
        >`
          SELECT COUNT(*) AS "migrationTotal",
                 COUNT(*) FILTER (
                   WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
                 ) AS "migrationApplied"
          FROM "_prisma_migrations"
        `;
        if (
          Number(migrationCheck[0]?.migrationTotal) !==
            Number(databaseInfo[0].migrationTotal) ||
          Number(migrationCheck[0]?.migrationApplied) !==
            Number(databaseInfo[0].migrationApplied)
        ) {
          throw new Error("Prisma migration history changed during QA reset.");
        }

        const counts: Record<string, number> = {};
        for (const table of applicationTables) {
          const rows = await tx.$queryRawUnsafe<{ count: bigint }[]>(
            `SELECT COUNT(*) AS count FROM public."${table}"`,
          );
          counts[table] = Number(rows[0]?.count ?? 0);
        }
        const expectedCounts: Record<string, number> = {
          AcademicTerm: 8,
          AcademicYear: 2,
          Bill: 0,
          BillCreditApplication: 0,
          BillItem: 0,
          Class: 12,
          ClassSubject: 120,
          Enrollment: 92,
          Exam: 60,
          ExamSubject: 300,
          Expense: 10,
          FeeStructure: 116,
          GradeScale: 1,
          GradeScaleEntry: 8,
          Infrastructure: 3,
          Mark: 1239,
          Payment: 0,
          School: 1,
          Section: 4,
          Student: 52,
          StudentCharge: 14,
          StudentChargeApplication: 0,
          StudentCredit: 2,
          StudentDiscount: 12,
          StudentDiscountFee: discountSeeds.reduce(
            (total, discount) => total + discount.feeTypes.length,
            0,
          ),
          Subject: 5,
          Teacher: 8,
          TeacherAssignment: 120,
          TeacherSalary: 40,
          TeacherSalaryPayment: 16,
          User: 1,
        };
        for (const [table, expected] of Object.entries(expectedCounts)) {
          if (counts[table] !== expected) {
            throw new Error(
              `Fixture count mismatch for ${table}: expected ${expected}, found ${counts[table]}.`,
            );
          }
        }
        if (
          studentPlans.length !== 52 ||
          new Set(studentPlans.map((plan) => plan.admissionNumber)).size !== 52 ||
          enrollmentRows.length !== 92 ||
          exams.length !== 60 ||
          markRows.length !== 1239 ||
          gradeBoundaryPercentages.length !== 16
        ) {
          throw new Error("The generated QA fixture failed its consistency checks.");
        }
        const creditCheck = await bcrypt.compare(
          adminPassword,
          admin.password,
        );
        if (!creditCheck || admin.role !== "ADMIN") {
          throw new Error("The QA Accountant credentials failed verification.");
        }

        return {
          schoolId: school.id,
          adminEmail,
          academicYearIds: years.map((year) => year.id),
          resetCounts: zeroCounts,
          counts,
          migrationTotal: Number(migrationCheck[0].migrationTotal),
          migrationApplied: Number(migrationCheck[0].migrationApplied),
          fixture: {
            classes: classes.length,
            subjects: subjects.length,
            students: studentPlans.length,
            studentsInYear2084: enrollmentRows.filter(
              (enrollment) => enrollment.academicYearId === year84.id,
            ).length,
            teachers: teachers.length,
            terms: terms.length,
            feeStructures: feeRows.length,
            studentCharges: chargeRows.length,
            discounts: discountSeeds.length,
            exams: exams.length,
            examSubjects: examSubjects.length,
            marks: markRows.length,
            publishedLockedExams: 1,
            incompleteUnpublishedExams: 1,
            salaryRecords: salaryRows.length,
            salaryPayments: salaryPaymentRows.length,
            expenses: expenseSeeds.length,
          },
        };
      },
      { maxWait: 30000, timeout: 300000 },
    );

    const persistedCounts: Record<string, number> = {};
    for (const table of applicationTables) {
      const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) AS count FROM public."${table}"`,
      );
      persistedCounts[table] = Number(rows[0]?.count ?? 0);
    }
    if (JSON.stringify(persistedCounts) !== JSON.stringify(resetCounts.counts)) {
      throw new Error("Persisted QA record counts differ from the committed fixture.");
    }

    console.log(
      JSON.stringify(
        {
          target: `${approvedHost}/${approvedDatabase}`,
          migrationHistory: {
            total: resetCounts.migrationTotal,
            applied: resetCounts.migrationApplied,
            preserved: true,
          },
          preResetCounts: beforeResetCounts,
          verifiedEmptyDuringReset: resetCounts.resetCounts,
          fixture: resetCounts.fixture,
          persistedCounts,
          qaAccount: {
            email: resetCounts.adminEmail,
            password: adminPassword,
            role: "ADMIN",
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "QA reset failed.");
  process.exitCode = 1;
});
