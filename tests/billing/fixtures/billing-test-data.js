import { bsToDate } from "../../../src/lib/nepali-date";

export const MARKER = "BILL_QA_2083";
export const SCHOOL_NAME = `${MARKER} Test School`;

export const academicYearData = {
  name: `${MARKER} Academic Year`,
  startDate: bsToDate(2083, 1, 1),
  endDate: bsToDate(2083, 12, 30),
};

export const nextAcademicYearData = {
  name: `${MARKER} Academic Year 2`,
  startDate: bsToDate(2084, 1, 1),
  endDate: bsToDate(2084, 12, 30),
};

export const classData = [
  { key: "grade5", name: "Grade 5", order: 5 },
  { key: "grade6", name: "Grade 6", order: 6 },
];

export const studentData = [
  { key: "S001", firstName: "Aarav", lastName: "Sharma", classKey: "grade5" },
  { key: "S002", firstName: "Sita", lastName: "Gurung", classKey: "grade5" },
  { key: "S003", firstName: "Rohan", lastName: "Thapa", classKey: "grade5" },
  { key: "S004", firstName: "Nisha", lastName: "KC", classKey: "grade5" },
  { key: "S005", firstName: "Bibek", lastName: "Rai", classKey: "grade5" },
  { key: "S006", firstName: "Anisha", lastName: "Lama", classKey: "grade5" },
  { key: "S007", firstName: "Prakash", lastName: "Adhikari", classKey: "grade5" },
  { key: "S008", firstName: "Samir", lastName: "Poudel", classKey: "grade6" },
  { key: "S009", firstName: "Milan", lastName: "Bhandari", classKey: "grade5" },
  { key: "S010", firstName: "Kriti", lastName: "Karki", classKey: "grade5" },
];

export const feeData = [
  { classKey: "grade5", feeType: "TUITION", name: "Tuition", frequency: "MONTHLY", amount: 5000 },
  { classKey: "grade5", feeType: "ADMISSION", name: "Admission", frequency: "ANNUAL", amount: 3000 },
  { classKey: "grade5", feeType: "COMPUTER_LAB", name: "Computer Lab", frequency: "MONTHLY", amount: 500 },
  { classKey: "grade5", feeType: "EXAM", name: "Exam", frequency: "TERM", amount: 800 },
  { classKey: "grade5", feeType: "MISCELLANEOUS", name: "Class Miscellaneous", frequency: "ONE_TIME", amount: 1200 },
  { classKey: "grade6", feeType: "TUITION", name: "Tuition", frequency: "MONTHLY", amount: 6000 },
  { classKey: "grade6", feeType: "ADMISSION", name: "Admission", frequency: "ANNUAL", amount: 3500 },
  { classKey: "grade6", feeType: "COMPUTER_LAB", name: "Computer Lab", frequency: "MONTHLY", amount: 700 },
  { classKey: "grade6", feeType: "EXAM", name: "Exam", frequency: "TERM", amount: 1000 },
];

export const nextYearFeeData = [
  { classKey: "grade5", feeType: "TUITION", name: "Tuition 2084", frequency: "MONTHLY", amount: 7200 },
  { classKey: "grade5", feeType: "ADMISSION", name: "Admission 2084", frequency: "ANNUAL", amount: 3600 },
  { classKey: "grade5", feeType: "COMPUTER_LAB", name: "Computer Lab 2084", frequency: "MONTHLY", amount: 800 },
  { classKey: "grade5", feeType: "EXAM", name: "Exam 2084", frequency: "TERM", amount: 1000 },
];

export const billingPeriods = {
  P1: { startMonth: 1, endMonth: 3 },
  P2: { startMonth: 4, endMonth: 6 },
  P3: { startMonth: 7, endMonth: 9 },
  P4: { startMonth: 10, endMonth: 12 },
  P5: { startMonth: 3, endMonth: 4 },
  P6: { startMonth: 1, endMonth: 7 },
  P7: { startMonth: 4, endMonth: 5 },
  P8: { startMonth: 3, endMonth: 3 },
};

export const studentChargeData = [
  { studentKey: "S003", description: "BUS Monthly", feeType: "BUS", frequency: "MONTHLY", quantity: 1, rate: 1500 },
  { studentKey: "S003", description: "Student Misc One-Time", feeType: "MISCELLANEOUS", frequency: "ONE_TIME", quantity: 1, rate: 700 },
  { studentKey: "S004", description: "BUS Monthly", feeType: "BUS", frequency: "MONTHLY", quantity: 1, rate: 1000 },
  { studentKey: "S004", description: "BUS Term Quantity Two", feeType: "BUS", frequency: "TERM", quantity: 2, rate: 400 },
  { studentKey: "S005", description: "BUS Monthly", feeType: "BUS", frequency: "MONTHLY", quantity: 1, rate: 1200 },
  { studentKey: "S005", description: "BUS Annual Quantity Three", feeType: "BUS", frequency: "ANNUAL", quantity: 3, rate: 200 },
  { studentKey: "S006", description: "Student Misc Term", feeType: "MISCELLANEOUS", frequency: "TERM", quantity: 1, rate: 2000 },
  { studentKey: "S007", description: "BUS Quantity Two", feeType: "BUS", frequency: "MONTHLY", quantity: 2, rate: 800 },
];

export const discountData = [
  { key: "D01-S002", studentKey: "S002", name: "D01 Tuition Support", percentage: 10, feeTypes: ["TUITION"], isActive: true },
  { key: "D02-S002", studentKey: "S002", name: "D02 Lab Support", percentage: 20, feeTypes: ["COMPUTER_LAB"], isActive: true },
  { key: "D05-S002", studentKey: "S002", name: "D05 Exam Support", percentage: 25, feeTypes: ["EXAM"], isActive: true },
  { key: "D03-S002", studentKey: "S002", name: "D03 General Support", percentage: 15, feeTypes: ["TUITION", "ADMISSION", "EXAM"], isActive: false },
  { key: "D04-S006", studentKey: "S006", name: "D04 Full Tuition Scholarship", percentage: 100, feeTypes: ["TUITION"], isActive: true },
  { key: "D01-S003", studentKey: "S003", name: "D01 Tuition Support", percentage: 10, feeTypes: ["TUITION"], isActive: false },
  { key: "D02-S003", studentKey: "S003", name: "D02 Lab Support", percentage: 20, feeTypes: ["COMPUTER_LAB"], isActive: false },
];

export const expected = {
  ordinaryP1: 21500,
  multipleDiscounts: 19500,
  generalDiscount: 18680,
  fullScholarship: 8500,
  studentCharges: 26700,
  studentChargesWithDiscounts: 24900,
  quantityBasedBus: 26300,
  grade6P1: 24600,
};
