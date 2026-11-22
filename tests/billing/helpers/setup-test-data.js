import {
  MARKER,
  SCHOOL_NAME,
  academicYearData,
  classData,
  studentData,
  feeData,
  studentChargeData,
  discountData,
} from "../fixtures/billing-test-data";

export async function setupTestData(prisma) {
  const matchingSchools = await prisma.school.findMany({
    where: { name: SCHOOL_NAME },
    select: { id: true },
  });
  if (matchingSchools.length > 1) {
    throw new Error(
      `Found ${matchingSchools.length} schools with QA marker ${MARKER}; refusing ambiguous fixture setup.`,
    );
  }

  const school = matchingSchools[0]
    ? await prisma.school.update({
        where: { id: matchingSchools[0].id },
        data: { shortName: MARKER },
      })
    : await prisma.school.create({
        data: { name: SCHOOL_NAME, shortName: MARKER },
      });

  const academicYear = await prisma.academicYear.upsert({
    where: {
      schoolId_name: { schoolId: school.id, name: academicYearData.name },
    },
    create: {
      schoolId: school.id,
      ...academicYearData,
      isActive: true,
    },
    update: {
      startDate: academicYearData.startDate,
      endDate: academicYearData.endDate,
      isActive: true,
    },
  });

  const terms = [];
  for (const [index, name] of ["Term 1", "Term 2", "Term 3", "Term 4"].entries()) {
    terms.push(
      await prisma.academicTerm.upsert({
        where: {
          academicYearId_order: {
            academicYearId: academicYear.id,
            order: index + 1,
          },
        },
        create: {
          academicYearId: academicYear.id,
          name,
          order: index + 1,
        },
        update: { name },
      }),
    );
  }

  const classes = {};
  for (const item of classData) {
    classes[item.key] = await prisma.class.upsert({
      where: {
        schoolId_name: { schoolId: school.id, name: item.name },
      },
      create: {
        schoolId: school.id,
        name: item.name,
        order: item.order,
      },
      update: { order: item.order },
    });
  }

  const students = {};
  for (const item of studentData) {
    const admissionNumber = `${MARKER}_${item.key}`;
    students[item.key] = await prisma.student.upsert({
      where: {
        schoolId_admissionNumber: {
          schoolId: school.id,
          admissionNumber,
        },
      },
      create: {
        schoolId: school.id,
        admissionNumber,
        firstName: item.firstName,
        lastName: item.lastName,
      },
      update: {
        firstName: item.firstName,
        lastName: item.lastName,
      },
    });

    await prisma.enrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: students[item.key].id,
          academicYearId: academicYear.id,
        },
      },
      create: {
        studentId: students[item.key].id,
        academicYearId: academicYear.id,
        classId: classes[item.classKey].id,
        rollNumber: Number(item.key.slice(1)),
      },
      update: {
        classId: classes[item.classKey].id,
        rollNumber: Number(item.key.slice(1)),
      },
    });
  }

  const fees = {};
  for (const item of feeData) {
    const key = `${item.classKey}:${item.feeType}`;
    fees[key] = await prisma.feeStructure.upsert({
      where: {
        academicYearId_classId_feeType_name: {
          academicYearId: academicYear.id,
          classId: classes[item.classKey].id,
          feeType: item.feeType,
          name: item.name,
        },
      },
      create: {
        academicYearId: academicYear.id,
        classId: classes[item.classKey].id,
        feeType: item.feeType,
        name: item.name,
        frequency: item.frequency,
        amount: item.amount,
        isActive: true,
      },
      update: {
        frequency: item.frequency,
        amount: item.amount,
        isActive: true,
      },
    });
  }

  const charges = {};
  for (const item of studentChargeData) {
    const description = `${MARKER} ${item.description}`;
    const student = students[item.studentKey];
    const existing = await prisma.studentCharge.findMany({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
        description,
      },
      select: { id: true },
    });
    if (existing.length > 1) {
      throw new Error(`Duplicate marked student charge: ${description}`);
    }

    charges[`${item.studentKey}:${item.description}`] = existing[0]
      ? await prisma.studentCharge.update({
          where: { id: existing[0].id },
          data: {
            feeType: item.feeType,
            frequency: item.frequency,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
            startDate: academicYearData.startDate,
            endDate: item.endDate ?? null,
          },
        })
      : await prisma.studentCharge.create({
          data: {
            studentId: student.id,
            academicYearId: academicYear.id,
            description,
            feeType: item.feeType,
            frequency: item.frequency,
            quantity: item.quantity,
            rate: item.rate,
            amount: item.quantity * item.rate,
            startDate: academicYearData.startDate,
            endDate: item.endDate ?? null,
          },
        });
  }

  const discounts = {};
  for (const item of discountData) {
    const student = students[item.studentKey];
    const existing = await prisma.studentDiscount.findMany({
      where: {
        studentId: student.id,
        academicYearId: academicYear.id,
        name: item.name,
      },
      select: { id: true },
    });
    if (existing.length > 1) {
      throw new Error(`Duplicate marked discount: ${item.key}`);
    }

    discounts[item.key] = await prisma.studentDiscount.upsert({
      where: { id: existing[0]?.id ?? `missing-${MARKER}-${item.key}` },
      create: {
        studentId: student.id,
        academicYearId: academicYear.id,
        name: item.name,
        percentage: item.percentage,
        isActive: item.isActive,
        startDate: academicYearData.startDate,
        feeTypes: { create: item.feeTypes.map((feeType) => ({ feeType })) },
      },
      update: {
        percentage: item.percentage,
        isActive: item.isActive,
        startDate: academicYearData.startDate,
        endDate: null,
        feeTypes: {
          deleteMany: {},
          create: item.feeTypes.map((feeType) => ({ feeType })),
        },
      },
    });
  }

  return {
    marker: MARKER,
    schoolId: school.id,
    academicYearId: academicYear.id,
    academicYearName: academicYear.name,
    classIds: Object.fromEntries(
      Object.entries(classes).map(([key, value]) => [key, value.id]),
    ),
    studentIds: Object.fromEntries(
      Object.entries(students).map(([key, value]) => [key, value.id]),
    ),
    feeIds: Object.fromEntries(
      Object.entries(fees).map(([key, value]) => [key, value.id]),
    ),
    chargeIds: Object.fromEntries(
      Object.entries(charges).map(([key, value]) => [key, value.id]),
    ),
    discountIds: Object.fromEntries(
      Object.entries(discounts).map(([key, value]) => [key, value.id]),
    ),
    termIds: terms.map((term) => term.id),
  };
}
