# Isolated QA Reset and Fixture Report

**Date:** 2026-11-23
**Target:** `ep-green-glade-ayptuugl-pooler.c-5.us-east-2.aws.neon.tech/neondb`
**Status:** Reset and primary fixture seed completed and verified.

## Scope and safeguards

- The user explicitly authorized a full reset of this isolated QA database after the earlier preservation-only request was superseded.
- The reset script required the exact host, database name, and confirmation token; checked the live database name and exact application-table inventory before truncating.
- Only the 31 allowlisted application tables were truncated, inside the same transaction that seeded and verified the replacement fixture. `_prisma_migrations`, schema objects, and extensions were not reset.
- The production seed was not run. No production system was accessed and no deployment was performed.
- All prior fictional QA rows, including bills, payments, credits, and audit history, were removed as authorized. The replacement fixture contains two synthetic credits and no bills, payments, or credit-application audit rows.

## Reset and fixture counts

The first reset attempt stopped on the database constraint requiring a manual credit's idempotency key and request hash to be supplied together. The transaction rolled back. Read-only verification afterward found the original school/student/credit/migration counts unchanged (`2` schools, `41` students, `1` credit, `0` credit applications, `16` migrations). The fixture was corrected to provide the request hash matching the application workflow, then the reset and seed completed.

Counts below are table rows before reset, after the primary reset/seed transaction, and current after preparing the separate marked billing test fixture. The last step only added/upserted the billing fixture and refreshed its ignored ID mapping; it did not run billing tests.

| Table | Before reset | Primary fixture | Current |
|---|---:|---:|---:|
| AcademicTerm | 16 | 8 | 16 |
| AcademicYear | 4 | 2 | 4 |
| Bill | 4 | 0 | 0 |
| BillCreditApplication | 0 | 0 | 0 |
| BillItem | 15 | 0 | 0 |
| Class | 14 | 12 | 14 |
| ClassSubject | 120 | 120 | 120 |
| Enrollment | 81 | 92 | 112 |
| Exam | 6 | 60 | 60 |
| ExamSubject | 26 | 300 | 300 |
| Expense | 0 | 10 | 10 |
| FeeStructure | 73 | 116 | 129 |
| GradeScale | 1 | 1 | 1 |
| GradeScaleEntry | 8 | 8 | 8 |
| Infrastructure | 2 | 3 | 3 |
| Mark | 172 | 1,239 | 1,239 |
| Payment | 6 | 0 | 0 |
| School | 2 | 1 | 2 |
| Section | 0 | 4 | 4 |
| Student | 41 | 52 | 62 |
| StudentCharge | 12 | 14 | 22 |
| StudentChargeApplication | 0 | 0 | 0 |
| StudentCredit | 1 | 2 | 2 |
| StudentDiscount | 9 | 12 | 19 |
| StudentDiscountFee | 12 | 16 | 25 |
| Subject | 5 | 5 | 5 |
| Teacher | 6 | 8 | 9 |
| TeacherAssignment | 61 | 120 | 120 |
| TeacherSalary | 2 | 40 | 40 |
| TeacherSalaryPayment | 3 | 16 | 16 |
| User | 1 | 1 | 1 |

Prisma migration history remained **16 total / 16 applied**. The reset script verified all allowlisted tables were empty before seeding, asserted expected primary-fixture counts inside the transaction, and rechecked persisted counts after commit. The current counts were then independently queried against the live target.

## Primary synthetic fixture

- 1 fictional school; 12 ordered classes; 4 sections; 5 subjects.
- 2 academic years and 8 terms; 52 students and 92 enrollments, including 40 students enrolled in the second year.
- 8 teachers, 120 teacher assignments, 116 fee structures, 14 student charges, 12 discounts, and 16 discount-fee links.
- 2 student credits: one auditable manual adjustment with a matching idempotency hash, and one legacy credit.
- 60 examinations, 300 exam subjects, and 1,239 marks; one exam is published and locked. Grade-boundary values, tied marks, and one intentionally incomplete unpublished exam are represented.
- 40 salary records, 16 salary payments, and 10 expenses.
- One synthetic `ADMIN` user, `qa.accountant@example.test`. A random one-time password was generated and verified against its stored bcrypt hash. During Phase 1, the account password was rotated again and the new stored hash was verified; plaintext credentials are intentionally omitted from this report.

## Supplemental billing fixture

The isolated billing fixture preparation was run only to replace stale test IDs after the reset. It added its separately marked school with 2 academic years, 2 classes, 10 students, 20 enrollments, 13 fees, 8 student charges, 7 discounts, and 1 teacher. The ignored `tests/billing/fixtures/billing-test-ids.json` mapping now points to those newly prepared records. The stress suite and credit integration suite were **not** run against the reset dataset.

## Validation and follow-up

- Passed: `npx eslint scripts/qa/reset-and-seed.ts`, `npx tsc --noEmit`, and `npx prisma validate`.
- The successful run emitted a `pg` overlapping-query deprecation warning from parallel calls inside the interactive transaction. The script now performs those calls sequentially to avoid that warning on future runs; the verified database was not reset again for this cleanup.
- The prior billing results in [BILLING-QA-REPORT.md](./tests/billing/BILLING-QA-REPORT.md) predate this reset and must be treated as historical until regression-tested on the refreshed fixture.
- No commit or push was made.
