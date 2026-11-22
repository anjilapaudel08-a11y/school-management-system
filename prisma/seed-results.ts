import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

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

const subjectNames = [
  ["English", "ENG"],
  ["Nepali", "NEP"],
  ["Mathematics", "MATH"],
  ["Science", "SCI"],
  ["Social Studies", "SOC"],
] as const;

async function main() {
  const school = await prisma.school.findFirst();
  if (!school) throw new Error("No school found. Run the main seed first.");

  const academicYear =
    (await prisma.academicYear.findFirst({
      where: { schoolId: school.id, isActive: true },
    })) ??
    (await prisma.academicYear.findFirst({
      where: { schoolId: school.id },
      orderBy: { createdAt: "desc" },
    }));
  if (!academicYear) throw new Error("No academic year found.");

  let section = await prisma.section.findFirst({
    where: { schoolId: school.id, name: "A" },
  });
  if (!section) {
    section = await prisma.section.create({
      data: { schoolId: school.id, name: "A" },
    });
  }

  const subjects = [];
  for (const [name, code] of subjectNames) {
    const subject =
      (await prisma.subject.findFirst({ where: { name } })) ??
      (await prisma.subject.create({ data: { name, code } }));
    subjects.push(subject);
  }

  const terms = [];
  for (let order = 1; order <= 4; order++) {
    const name = `Term ${order}`;
    const term =
      (await prisma.academicTerm.findFirst({
        where: { academicYearId: academicYear.id, name },
      })) ??
      (await prisma.academicTerm.create({
        data: { academicYearId: academicYear.id, name, order },
      }));
    terms.push(term);
  }

  const firstNames = ["Aarav", "Sita", "Rohan", "Priya", "Nabin"];
  const lastNames = ["Shrestha", "Thapa", "Gurung", "Rai", "Karki"];
  const allStudents = [];
  let studentIndex = 1;

  for (const [classIndex, className] of classNames.entries()) {
    console.log(`Preparing ${className}...`);

    const schoolClass =
      (await prisma.class.findFirst({
        where: { schoolId: school.id, name: className },
      })) ??
      (await prisma.class.create({
        data: { schoolId: school.id, name: className, order: classIndex + 1 },
      }));

    await prisma.classSubject.createMany({
      skipDuplicates: true,
      data: subjects.map((subject) => ({
        classId: schoolClass.id,
        subjectId: subject.id,
        academicYearId: academicYear.id,
      })),
    });

    await prisma.student.createMany({
      skipDuplicates: true,
      data: firstNames.map((firstName, index) => ({
        schoolId: school.id,
        admissionNumber: `${academicYear.name}-TEST-${String(studentIndex + index).padStart(3, "0")}`,
        firstName,
        lastName: lastNames[index],
        gender: index % 2 === 0 ? "Male" : "Female",
        address: "Pokhara, Nepal",
        guardianPhone: `980000${String(studentIndex + index).padStart(4, "0")}`,
      })),
    });

    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        admissionNumber: {
          in: firstNames.map((_, index) =>
            `${academicYear.name}-TEST-${String(studentIndex + index).padStart(3, "0")}`
          ),
        },
      },
      orderBy: { admissionNumber: "asc" },
    });

    await prisma.enrollment.createMany({
      skipDuplicates: true,
      data: students.map((student, index) => ({
        studentId: student.id,
        academicYearId: academicYear.id,
        classId: schoolClass.id,
        sectionId: section!.id,
        rollNumber: index + 1,
      })),
    });

    allStudents.push(...students);

    for (const [termIndex, term] of terms.entries()) {
      let exam = await prisma.exam.findFirst({
        where: {
          termId: term.id,
          classId: schoolClass.id,
          name: `Term ${termIndex + 1} Examination`,
        },
      });

      if (!exam) {
        exam = await prisma.exam.create({
          data: {
            termId: term.id,
            classId: schoolClass.id,
            name: `Term ${termIndex + 1} Examination`,
            isPublished: true,
          },
        });
      }

      const theoryFullMarks = termIndex === 0 ? 40 : 80;
      const practicalFullMarks = termIndex === 0 ? 10 : 20;

      await prisma.examSubject.createMany({
        skipDuplicates: true,
        data: subjects.map((subject) => ({
          examId: exam!.id,
          subjectId: subject.id,
          theoryFullMarks,
          practicalFullMarks,
        })),
      });

      const examSubjects = await prisma.examSubject.findMany({
        where: { examId: exam.id },
        include: { subject: true },
      });

      const markRows = [];
      for (const [studentIndexInClass, student] of students.entries()) {
        for (const [subjectIndex, examSubject] of examSubjects.entries()) {
          const pattern =
            (studentIndexInClass + subjectIndex + termIndex) % 7;
          const theoryRate = [0.96, 0.84, 0.72, 0.64, 0.54, 0.44, 0.28][pattern];
          const practicalRate = [0.95, 0.82, 0.75, 0.62, 0.52, 0.42, 0.24][pattern];

          markRows.push({
            examSubjectId: examSubject.id,
            studentId: student.id,
            theoryMarks: Number((theoryFullMarks * theoryRate).toFixed(2)),
            practicalMarks: Number((practicalFullMarks * practicalRate).toFixed(2)),
          });
        }
      }

      await prisma.mark.createMany({
        skipDuplicates: true,
        data: markRows,
      });
    }

    studentIndex += firstNames.length;
  }

  console.log(
    `✓ Test data ready for ${allStudents.length} students across ${classNames.length} classes and 4 terms.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
