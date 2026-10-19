import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { bsToDate } from "../src/lib/nepali-date";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Starting database seed...");

  // ---------------------------------------------------------
  // 1. CLEAN EXISTING DATA
  // ---------------------------------------------------------

  await prisma.billCreditApplication.deleteMany();
  await prisma.studentCredit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.billItem.deleteMany();
  await prisma.bill.deleteMany();

  await prisma.studentDiscountFee.deleteMany();
  await prisma.studentDiscount.deleteMany();
  await prisma.studentCharge.deleteMany();
  await prisma.feeStructure.deleteMany();

  await prisma.mark.deleteMany();
  await prisma.examSubject.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.academicTerm.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.teacherAssignment.deleteMany();
  await prisma.enrollment.deleteMany();

  await prisma.teacher.deleteMany();
  await prisma.student.deleteMany();
  await prisma.section.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.infrastructure.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();

  // ---------------------------------------------------------
  // 2. ADMIN USER
  // ---------------------------------------------------------

  const hashedPassword = await bcrypt.hash(
    "admin123",
    10
  );

  const admin = await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@school.com",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log(`✓ Admin created: ${admin.email}`);
  console.log("  Password: admin123");

  // ---------------------------------------------------------
  // 3. SCHOOL
  // ---------------------------------------------------------

  const school = await prisma.school.create({
    data: {
      name: "Sunrise Secondary School",
      shortName: "SSS",
      address: "Pokhara, Nepal",
      phone: "061-123456",
      email: "info@sunriseschool.com",
      website: "https://sunriseschool.com",
      establishedYear: 2055,
      description:
        "Test school for School Management System development.",
    },
  });

  console.log(`✓ School created: ${school.name}`);

  // ---------------------------------------------------------
  // 4. ACADEMIC YEAR — 2083
  // ---------------------------------------------------------
  //
  // Approximate actual Gregorian dates are used internally.
  // The application itself should display/use BS dates.
  //
  // Baisakh 1, 2083 -> approximately April 14, 2026
  // Chaitra end, 2083 -> approximately April 13, 2027
  //
  // ---------------------------------------------------------

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      name: "2083",
      startDate: bsToDate(2083, 1, 1),
      endDate: bsToDate(2083, 12, 30),
      isActive: true,
    },
  });

  console.log(`✓ Academic year created: ${academicYear.name}`);

  // ---------------------------------------------------------
  // 5. CLASSES
  // ---------------------------------------------------------

  const classNames = [
    "Pre Nursery",
    "Nursery",
    "LKG",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
  ];

  const classes = [];

  for (let i = 0; i < classNames.length; i++) {
    const createdClass = await prisma.class.create({
      data: {
        schoolId: school.id,
        name: classNames[i],
        order: i + 1,
      },
    });

    classes.push(createdClass);
  }

  const grade5 = classes.find(
    (item) => item.name === "Grade 5"
  );

  if (!grade5) {
    throw new Error("Grade 5 was not created.");
  }

  console.log(`✓ ${classes.length} classes created`);

  // ---------------------------------------------------------
  // 6. SECTIONS
  // ---------------------------------------------------------

  const sectionA = await prisma.section.create({
    data: {
      schoolId: school.id,
      name: "A",
    },
  });

  const sectionB = await prisma.section.create({
    data: {
      schoolId: school.id,
      name: "B",
    },
  });

  console.log("✓ Sections A and B created");

  // ---------------------------------------------------------
  // 7. SUBJECTS
  // ---------------------------------------------------------

  const subjectData = [
    {
      name: "English",
      code: "ENG",
    },
    {
      name: "Nepali",
      code: "NEP",
    },
    {
      name: "Mathematics",
      code: "MATH",
    },
    {
      name: "Science",
      code: "SCI",
    },
    {
      name: "Social Studies",
      code: "SOC",
    },
  ];

  const subjects = [];

  for (const subject of subjectData) {
    const createdSubject =
      await prisma.subject.create({
        data: subject,
      });

    subjects.push(createdSubject);
  }

  console.log(`✓ ${subjects.length} subjects created`);

  // ---------------------------------------------------------
  // 8. GRADE 5 SUBJECTS
  // ---------------------------------------------------------

  for (const subject of subjects) {
    await prisma.classSubject.create({
      data: {
        classId: grade5.id,
        subjectId: subject.id,
        academicYearId: academicYear.id,
      },
    });
  }

  console.log("✓ Grade 5 subjects assigned");

  // ---------------------------------------------------------
  // 9. ACADEMIC TERMS
  // ---------------------------------------------------------

  const term1 = await prisma.academicTerm.create({
    data: {
      academicYearId: academicYear.id,
      name: "Term 1",
      order: 1,
    },
  });

  const term2 = await prisma.academicTerm.create({
    data: {
      academicYearId: academicYear.id,
      name: "Term 2",
      order: 2,
    },
  });

  const term3 = await prisma.academicTerm.create({
    data: {
      academicYearId: academicYear.id,
      name: "Term 3",
      order: 3,
    },
  });

  const term4 = await prisma.academicTerm.create({
    data: {
      academicYearId: academicYear.id,
      name: "Term 4",
      order: 4,
    },
  });

  console.log("✓ 4 academic terms created");

  // ---------------------------------------------------------
  // 10. STUDENTS
  // ---------------------------------------------------------

  const aarav = await prisma.student.create({
    data: {
      schoolId: school.id,
      admissionNumber: "2083-001",
      firstName: "Aarav",
      lastName: "Sharma",
      dateOfBirth: bsToDate(2074, 5, 15),
      gender: "Male",
      address: "Pokhara, Nepal",
      phone: "9800000001",
      email: "aarav@example.com",
      fatherName: "Raj Sharma",
      motherName: "Sita Sharma",
      guardianName: "Raj Sharma",
      guardianPhone: "9800000001",
    },
  });

  const sita = await prisma.student.create({
    data: {
      schoolId: school.id,
      admissionNumber: "2083-002",
      firstName: "Sita",
      lastName: "Thapa",
      dateOfBirth: bsToDate(2074, 8, 10),
      gender: "Female",
      address: "Pokhara, Nepal",
      phone: "9800000002",
      email: "sita@example.com",
      fatherName: "Hari Thapa",
      motherName: "Mina Thapa",
      guardianName: "Hari Thapa",
      guardianPhone: "9800000002",
    },
  });

  const rohan = await prisma.student.create({
    data: {
      schoolId: school.id,
      admissionNumber: "2083-003",
      firstName: "Rohan",
      lastName: "Gurung",
      dateOfBirth: bsToDate(2074, 3, 20),
      gender: "Male",
      address: "Pokhara, Nepal",
      phone: "9800000003",
      email: "rohan@example.com",
      fatherName: "Bikash Gurung",
      motherName: "Maya Gurung",
      guardianName: "Bikash Gurung",
      guardianPhone: "9800000003",
    },
  });

  console.log("✓ 3 students created");

  // ---------------------------------------------------------
  // 11. ENROLL STUDENTS IN GRADE 5
  // ---------------------------------------------------------

  await prisma.enrollment.create({
    data: {
      studentId: aarav.id,
      academicYearId: academicYear.id,
      classId: grade5.id,
      sectionId: sectionA.id,
      rollNumber: 1,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: sita.id,
      academicYearId: academicYear.id,
      classId: grade5.id,
      sectionId: sectionA.id,
      rollNumber: 2,
    },
  });

  await prisma.enrollment.create({
    data: {
      studentId: rohan.id,
      academicYearId: academicYear.id,
      classId: grade5.id,
      sectionId: sectionB.id,
      rollNumber: 3,
    },
  });

  console.log("✓ Students enrolled in Grade 5");

  // ---------------------------------------------------------
  // 12. FEE STRUCTURE
  // ---------------------------------------------------------
  //
  // Grade 5:
  //
  // Tuition       = 10,000/month
  // Admission     = 5,000/year
  // Exam          = 1,000/term
  // Computer Lab  = 500/month
  //
  // ---------------------------------------------------------

  await prisma.feeStructure.create({
    data: {
      academicYearId: academicYear.id,
      classId: grade5.id,
      feeType: "TUITION",
      name: "Tuition Fee",
      amount: 10000,
      frequency: "MONTHLY",
      isActive: true,
    },
  });

  await prisma.feeStructure.create({
    data: {
      academicYearId: academicYear.id,
      classId: grade5.id,
      feeType: "ADMISSION",
      name: "Admission Fee",
      amount: 5000,
      frequency: "ANNUAL",
      isActive: true,
    },
  });

  await prisma.feeStructure.create({
    data: {
      academicYearId: academicYear.id,
      classId: grade5.id,
      feeType: "EXAM",
      name: "Exam Fee",
      amount: 1000,
      frequency: "TERM",
      isActive: true,
    },
  });

  await prisma.feeStructure.create({
    data: {
      academicYearId: academicYear.id,
      classId: grade5.id,
      feeType: "COMPUTER_LAB",
      name: "Computer Lab Fee",
      amount: 500,
      frequency: "MONTHLY",
      isActive: true,
    },
  });

  console.log("✓ Grade 5 fee structure created");

  // ---------------------------------------------------------
  // 13. AARAV — MONTHLY BUS CHARGE
  // ---------------------------------------------------------
  //
  // Starts in Shrawan 2083.
  //
  // Therefore:
  //
  // Shrawan-Ashwin -> applies
  // Kartik-Poush   -> applies
  // Magh-Chaitra   -> applies
  //
  // ---------------------------------------------------------

  await prisma.studentCharge.create({
    data: {
      studentId: aarav.id,
      academicYearId: academicYear.id,
      description: "School Bus Fee",
      quantity: 1,
      rate: 3000,
      amount: 3000,
      feeType: "BUS",
      frequency: "MONTHLY",
      startDate: bsToDate(2083, 4, 1),
      endDate: null,
      notes: "Monthly bus transportation charge.",
    },
  });

  console.log("✓ Aarav monthly bus charge created");

  // ---------------------------------------------------------
  // 14. SITA — BUS STARTS LATER
  // ---------------------------------------------------------
  //
  // This lets us test charge date filtering.
  //
  // Shrawan-Ashwin -> should NOT appear
  // Kartik-Poush   -> should appear
  //
  // ---------------------------------------------------------

  await prisma.studentCharge.create({
    data: {
      studentId: sita.id,
      academicYearId: academicYear.id,
      description: "School Bus Fee",
      quantity: 1,
      rate: 3000,
      amount: 3000,
      feeType: "BUS",
      frequency: "MONTHLY",
      startDate: bsToDate(2083, 7, 1),
      endDate: null,
      notes: "Bus service starts from Kartik.",
    },
  });

  console.log("✓ Sita delayed-start bus charge created");

  // ---------------------------------------------------------
  // 15. ROHAN — ONE-TIME MISCELLANEOUS CHARGE
  // ---------------------------------------------------------
  //
  // Starts Kartik 2083.
  //
  // Shrawan-Ashwin -> should NOT appear
  // Kartik-Poush   -> should appear once
  // Later periods  -> should NOT repeat
  //
  // ---------------------------------------------------------

  await prisma.studentCharge.create({
    data: {
      studentId: rohan.id,
      academicYearId: academicYear.id,
      description: "Special Activity Fee",
      quantity: 1,
      rate: 2000,
      amount: 2000,
      feeType: "MISCELLANEOUS",
      frequency: "ONE_TIME",
      startDate: bsToDate(2083, 7, 1),
      endDate: null,
      notes: "One-time special activity charge.",
    },
  });

  console.log("✓ Rohan one-time miscellaneous charge created");

  // ---------------------------------------------------------
  // 16. AARAV — TUITION DISCOUNT
  // ---------------------------------------------------------
  //
  // 10% discount on TUITION only.
  //
  // It does NOT apply to:
  // - Bus
  // - Computer Lab
  // - Admission
  // - Exam
  //
  // ---------------------------------------------------------

  const aaravDiscount =
    await prisma.studentDiscount.create({
      data: {
        studentId: aarav.id,
        academicYearId: academicYear.id,
        name: "Merit Tuition Discount",
        percentage: 10,
        isActive: true,
        startDate: bsToDate(2083, 4, 1),
        endDate: null,
        notes:
          "10% discount on tuition fee only.",
      },
    });

  await prisma.studentDiscountFee.create({
    data: {
      discountId: aaravDiscount.id,
      feeType: "TUITION",
    },
  });

  console.log("✓ Aarav 10% tuition discount created");

  // ---------------------------------------------------------
  // 17. INFRASTRUCTURE
  // ---------------------------------------------------------

  await prisma.infrastructure.create({
    data: {
      schoolId: school.id,
      name: "Main School Building",
      description:
        "Main academic building.",
    },
  });

  await prisma.infrastructure.create({
    data: {
      schoolId: school.id,
      name: "Computer Lab",
      description:
        "Computer laboratory for students.",
    },
  });

  await prisma.infrastructure.create({
    data: {
      schoolId: school.id,
      name: "School Bus",
      description:
        "School transportation service.",
    },
  });

  console.log("✓ Infrastructure created");

  // ---------------------------------------------------------
  // FINAL SUMMARY
  // ---------------------------------------------------------

  console.log("");
  console.log("======================================");
  console.log("🌱 SEED COMPLETED SUCCESSFULLY");
  console.log("======================================");
  console.log("");
  console.log("LOGIN");
  console.log("--------------------------------------");
  console.log("Email:    admin@school.com");
  console.log("Password: admin123");
  console.log("");
  console.log("SCHOOL");
  console.log("--------------------------------------");
  console.log("Sunrise Secondary School");
  console.log("Academic Year: 2083");
  console.log("");
  console.log("TEST STUDENTS");
  console.log("--------------------------------------");
  console.log("Aarav Sharma  → Grade 5 A → Bus Rs. 3,000/month");
  console.log("Sita Thapa    → Grade 5 A → Bus starts Kartik");
  console.log("Rohan Gurung  → Grade 5 B → One-time Rs. 2,000");
  console.log("");
  console.log("GRADE 5 FEES");
  console.log("--------------------------------------");
  console.log("Tuition      → Rs. 10,000/month");
  console.log("Admission    → Rs. 5,000/year");
  console.log("Exam         → Rs. 1,000/term");
  console.log("Computer Lab → Rs. 500/month");
  console.log("");
  console.log("AARAV DISCOUNT");
  console.log("--------------------------------------");
  console.log("Tuition → 10%");
  console.log("");
  console.log("BILLING TEST PERIODS");
  console.log("--------------------------------------");
  console.log("1. Shrawan 2083 → Ashwin 2083");
  console.log("2. Kartik 2083 → Poush 2083");
  console.log("3. Magh 2083 → Chaitra 2083");
  console.log("");
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });