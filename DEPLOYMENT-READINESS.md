# Deployment Readiness Report

**Assessment date:** 2026-11-22  
**Decision:** **Not ready for school deployment yet.** The user-confirmed isolated QA database was used for focused end-to-end checks; production configuration, recovery rehearsal, and remaining billing coverage are still unverified.

## Focused verification refresh (2026-11-22)

The user confirmed the configured Neon database is test-only and authorized targeted QA writes and cleanup. All temporary accounts, exams, and marks created for this refresh were removed. The database returned to 49 exams / 48 published exams; no schema change or migration was made. No production credentials were exposed and no production system was accessed.

| Focus | Latest finding |
|---|---|
| Section removal | **Pass.** No `/api/sections` request or route remains under `src/app`; student registration, enrollment, and profile frontend/API paths contain no `sectionId` references. Legacy schema, migrations, seed references, and generated Prisma fields remain preserved. |
| Accountant setup and access | **Pass in QA.** The provisioning script created disposable `ADMIN` accounts that authenticated as “Accountant.” 25 student, academic, examination, results, and financial dashboard routes returned HTTP 200; the class-subjects route also loaded its assigned data. Anonymous `/api/students` remained 401. Temporary accounts were removed. Session expiry, logout, and recovery were not tested. |
| Grading logic and UI | **Pass in QA.** Marks were entered in the browser for 16 percentages spanning 0, 34.99, 35, 39.99, 40, 49.99, 50, 59.99, 60, 69.99, 70, 79.99, 80, 89.99, 90, and 100. All eight grades rendered correctly. Blank marks were rejected without rows; explicit zero was saved. |
| Publication, results, GPA, position, report cards, and printing | **Pass for the temporary exam.** UI publication locked marks; 8 result rows and 16 subject rows rendered; grade points, average GPA, and all 8 class positions matched expectations. A new report card and an existing report card opened. Print media hid the print controls and retained the marksheet. |
| Historical published exams | **No unassigned scales found.** All 48 pre-existing published exams had a scale assignment. However, the legacy `Grade Scale 1` contains only A+, A, B+, and B; some older marksheets therefore render `N/A`. Four Grade 5 term exams in year 2083 each have 15 missing student-subject mark entries for the currently enrolled cohort. Preserve all published marks and assignments pending evidence and school approval. |
| Billing and migrations | **No billing logic or migration changes.** Broad billing QA: 47 passed, 0 failed, 10 blocked, 13 not executed. All 15 existing migrations remained applied; no migration was run. |
| Local validation | Final lint, TypeScript, tests, Prisma validation, and production build are listed below after rerun. |

### Safe Accountant provisioning procedure

The script requires `DATABASE_URL`, `ACCOUNTANT_PROVISION_EXPECTED_HOST`, `ACCOUNTANT_PROVISION_EXPECTED_DATABASE`, `ACCOUNTANT_PROVISION_CONFIRMATION`, `ACCOUNTANT_NAME`, `ACCOUNTANT_EMAIL`, and `ACCOUNTANT_PASSWORD`. The confirmation must be exactly `CREATE_ACCOUNTANT`. The script parses the PostgreSQL URL and refuses to proceed unless its hostname and database name exactly match the expected-target variables. This is a guardrail, not a way to make production safe: use only an independently approved isolated QA configuration.

From the project directory, first populate `DATABASE_URL` in the current PowerShell process from the approved QA-only secret store; do not paste it into a command, source file, committed `.env` file, screenshot, or shell history. Then set the exact approved QA host/database, confirmation, and intended account identity in that process environment. Read the one-time password from a secure prompt or approved secret store into `ACCOUNTANT_PASSWORD` without echoing it, and run:

```powershell
npm run provision:accountant
```

Use a unique password of at least 14 characters. It is passed only through the process environment, hashed with bcrypt cost 12, and only the hash is stored; the plaintext is not printed or persisted. The script prints the account email on success. If the email already exists, it makes no account or password changes and exits with an error. Clear all temporary environment variables immediately afterward. Verify the selected host/database independently before supplying `DATABASE_URL`; never run this procedure against production.

## Validation and supporting evidence

| Area | Result |
|---|---|
| ESLint | Pass: `npm run lint`; no errors or warnings |
| TypeScript | Pass: `npx tsc --noEmit` |
| Grade calculation tests | Pass: 4/4 focused cases, including all 16 percentage points, raw percentage behavior, legacy inclusive ranges, and performance labels |
| Academic-risk integration test | Pass against the confirmed isolated QA database; missing, blank, and zero marks were checked; the test's temporary records were cleaned up |
| Prisma schema | Pass: `npx prisma validate`; generated client successfully |
| Prisma migrations | Pass: all 15 migrations remain applied; `npx prisma migrate status` reports up to date. No migration was run for this refresh. |
| Production build | Pass: `npm run build` |
| Billing QA report | Latest run: 47 passed, 0 failed, 10 blocked, 13 not executed. See [the billing QA report](./tests/billing/BILLING-QA-REPORT.md). |
| Accountant route smoke test | 25 dashboard routes returned HTTP 200. One initial compile timeout was resolved by retrying; class-subjects loaded its data. |
| QA cleanup | Temporary Accountant accounts, two exams, and 16 marks were removed. The database returned to 49 exams / 48 published exams. |

No Prisma schema changes or migrations were made, and the destructive production seed was not run.

## End-to-end workflow checklist

Status meanings: **Tested** means exercised through the UI or a focused test; **Partial** means only a subset of the workflow was exercised; **Not tested** means no meaningful execution; **Incomplete** means a product or deployment gap exists.

| Role / workflow | Status | Evidence and remaining coverage |
|---|---|---|
| Accountant sign-in and protected API access | Tested | Provisioned a temporary `ADMIN`/Accountant against isolated QA, logged in, and opened the required student, academic, examination, result, and financial dashboard routes. Anonymous `/api/students` returned 401. Logout, expired sessions, password reset, and recovery were not tested. |
| Student registration and enrollment | Partial | Created a temporary student and Grade 5 enrollment through the UI, then removed the QA record. The school confirmed it does not use sections; section selection was removed from the student UI/profile path while legacy database columns and data are preserved. |
| Student profile and account statement | Partial | Existing student profile showed enrollment, bills, payments, discounts, and a separate `Remaining Due` amount. Profile edit, transfer, and other account-history cases were not exercised. |
| Teacher, class, subject, academic year/term, class-subject, and teacher-assignment management | Partial | Pages and existing records rendered. Create, edit, delete, activation, and relationship validation were not submitted through the UI. |
| Fee structure management | Partial | Fee form and existing fee data rendered. Fee create/edit/deactivation was not submitted through the UI. Historical fee snapshots are covered by prior billing QA scenarios. |
| Student charges and frequency/date rules | Partial | Charge form rendered. UI create/edit/deactivate was not submitted. Prior isolated billing QA covered MONTHLY, TERM, ANNUAL, ONE_TIME, date eligibility, replacement after unpaid cancellation, and concurrent bill generation. |
| Discounts | Partial | Discount form and configured discount rendered. The basic discount calculations were covered by prior billing QA, but discount date-boundary and overlap cases remain untested. |
| Bill generation, detail, cancellation, and regeneration | Partial | Bills list and an existing bill detail rendered, including line items and balances. Bill creation/cancellation were not submitted through the UI. Prior billing QA covered overlapping periods, duplicate requests, charge release on unpaid cancellation, and payment-protected cancellation. |
| Student payments and outstanding balances | Partial | Payment history and the original bill's remaining amount rendered in the UI. Posting or reversing a payment through the UI was not tested. Payment idempotency, partial/full settlements, waivers, and concurrency have prior API-level QA evidence. |
| Salary records and salary payments | Partial | Salary list showed gross Rs. 18,000, paid Rs. 12,000, and remaining Rs. 6,000. The concurrent salary-payment regression test passed. A salary/payment submission through the UI was not tested. |
| Expenses and bulk adjustments | Partial | Both forms and student choices rendered. No expense or bulk adjustment was submitted. |
| Exams and marks | Tested | Created a temporary two-subject Grade 5 / Term 4 exam through the UI, entered marks for 8 students at 16 boundary percentages, and saved explicit zeros. The UI rejected blank input; API verification found no row from the rejected save. Published and locked the exam through the UI. |
| Results, GPA, position, and marksheets | Tested for temporary exam | Verified 8 result rows, 16 subject grades, all eight grades, matching arithmetic-mean GPA, and 8 unique positions matching percentage ranking. Generated a new report card and checked print media. An existing Grade 8 / Term 4 report card opened; grades below its legacy scale's lowest defined band showed `N/A`. |
| School settings | Partial | Settings form rendered; save and validation were not tested. |
| Board Member authorization | Not applicable to the confirmed operating model / untested | The school confirmed one operational Accountant and no need for separate teacher/board logins. Existing `BOARD_MEMBER` enum values remain for compatibility; no role-permission redesign was made. |

### Results and grade-scale configuration

The approved default scale has thresholds A+ 90-100, A 80-<90, B+ 70-<80, B 60-<70, C+ 50-<60, C 40-<50, D 35-<40, and NG 0-<35, with grade points 4.0, 3.6, 3.2, 2.8, 2.4, 2.0, 1.6, and 0.0. Grade choice uses the raw percentage; display formatting does not influence it. Published exams save their scale so later scale edits/deletion cannot rewrite historical results. Existing published exams are linked to the former scale only when exactly one legacy scale exists; if multiple scales existed during migration, those exams remain unassigned and results are intentionally blocked until an explicit historical assignment is made. The approved scale is seeded by migration and is not editable/deletable.

The current result method remains unchanged: each subject uses its own theory/practical full marks; GPA is the arithmetic mean of subject grade points (including NG as zero); overall percentage and overall grade use total obtained marks divided by total full marks. Publication requires an actual mark row for every student/subject; a saved zero is therefore a real NG result, not a missing mark.

### Historical published exams and scale issues

The inventory found **zero of 48 previously published exams with a null grading-scale assignment**. No assignment repair is needed. Do not assign the new default scale to published exams or recalculate their grades.

Two separate historical-data limitations were observed:

- The affected exams are **Grade 5 / 2083 / Term 1 Examination**, **Term 2 Examination**, **Term 3 Examination**, and **Term 4 Examination**. Each has 15 missing student-subject mark entries when compared with the current enrolled cohort. Compare the original roster/enrollment at publication time and preserved mark sheets. If a mark is genuinely missing, restore it only from authoritative source records with school approval; do not insert zero or change existing published grades to make results calculate. Preserve each exam's locked state until reconciled.
- The legacy `Grade Scale 1` defines only A+, A, B+, and B. An existing Grade 8 / Term 4 report card therefore displays `N/A` for grades below 60%. Retrieve the original scale and published artifacts, then obtain a documented school decision before any repair. Do not extend or replace the pinned scale or recalculate the historical results arbitrarily.

## Billing evidence and limitations

The user's confirmed frequency rules are reflected in the prior isolated QA report: MONTHLY is rate x quantity x eligible months; TERM, ANNUAL, and ONE_TIME are rate x quantity once on the first eligible bill. No billing calculations, API logic, or schema were changed in this phase.

Prior QA examples:

- An unpaid first bill remained at Rs. 26,700; the next bill contained only new charges totaling Rs. 17,300. The statement showed Rs. 44,000 outstanding across the original bills without carrying the earlier charge forward.
- With a Rs. 100 partial payment, the first bill's remaining amount stayed on that bill; the next bill was Rs. 17,300 and the statement total was Rs. 43,900.
- The frequency test verified monthly quantity 3 = Rs. 4,500, term quantity 2 = Rs. 800, annual quantity 3 = Rs. 600, and a one-time amount of Rs. 700.

The latest billing suite had no failures among executed scenarios, but it is not complete:

- **Blocked (10):** previous-dues/credit application scenarios and injected transaction rollback cases.
- **Not executed (13):** multi-year billing, seven discount-date/overlap cases, concurrent payment-plus-waiver, and decimal/small/large/zero-value amounts.
- The billing runner calls API handlers directly; it does not certify browser workflows or authorization.

## Deployment blockers and handoff tasks

1. **Reconcile historical Grade 5 exams.** The four 2083 Term 1–4 examinations each have 15 missing student-subject entries for the current enrolled cohort. Compare with the original roster and authoritative marksheets; restore only source-verified missing marks after school approval. Preserve existing published marks and the locked state.
2. **Resolve legacy grading interpretation.** Recover the complete historical Grade Scale 1 definition or preserved published artifacts, then obtain a documented school decision about the existing `N/A` values. Do not silently alter the pinned scale or grades.
3. **Complete remaining authentication tests.** QA Accountant sign-in and feature access passed, but logout, session expiry, password reset/recovery, and detailed role/API authorization cases remain untested.
4. **Complete production configuration review.** Production values, secret rotation, hosting configuration, and production database target were not available for verification. Keep secrets out of source control and use a separate production database.
5. **Close billing coverage gaps.** The billing run had 10 blocked and 13 unexecuted cases. Resolve previous-dues/credit scope and run transaction rollback, multi-year, discount-boundary, concurrent payment-plus-waiver, and amount precision cases before certifying billing fully.
6. **Run a deployment handoff rehearsal.** Validate backups/restore, migration procedure, monitoring/log access, and rollback on a production-like staging deployment. No production deployment or restore drill was performed in this audit.

## Evidence notes

- Database inventory, browser workflows, and integration tests used the user-confirmed isolated QA target. Temporary test accounts/exams/marks were removed; no production system was accessed.
- Direct `node --test` could not resolve the generated Prisma client's extensionless import, including after generation. Running the test with the repository's `tsx` runner after `prisma generate` passed.
- Route smoke testing confirms page rendering, not complete CRUD or financial transaction correctness. Billing browser CRUD and several payment operations remain partial even though the direct-handler billing scenarios are reported separately.
