# Deployment Readiness Report

**Assessment date:** 2026-11-23
**Decision:** **Not ready for school deployment yet.** The isolated QA checks found no reproducible application billing defect, but four credit scenarios remain blocked; production configuration and a production-like recovery rehearsal are still unverified.

## Remaining billing and finance QA follow-up (2026-11-23)

The existing fictional QA dataset was preserved. No database reset, truncate, reseed, schema change, or migration was performed. No production system or credentials were used.

| Focus | Latest finding |
|---|---|
| Billing suite | **71 PASS, 0 FAIL, 4 BLOCKED, 0 NOT EXECUTED** after focused retries. The first run exposed one transient QA-database disconnect and test-only transaction-injector bugs; all five initial failures passed on focused retries after the test harness was corrected. |
| Prior dues and multi-year billing | **Pass.** E01-E04 verified unpaid, partial, multiple-payment, and fully settled prior bills remain on their original bills; later bills do not duplicate prior balances. B06 verified separate prior/new academic-year balances and duplicate prevention. |
| Discounts and amounts | **Pass.** All seven date/overlap cases, BUS/MISC discount exclusion, fractional rounding, small/large values, zero/negative inputs, and excessive payment checks ran. |
| Transaction rollback | **Pass.** Test-only injected failures rolled back bill generation (I01), payment/balance update (I02), waiver processing (I07), and salary payment (I08). The failure injector is not present in production code. |
| Credits | **Blocked (4).** `StudentCredit` and `BillCreditApplication` models exist, but no credit creation/application API, service, or UI exists; I09 credit-application rollback is likewise unavailable. |
| Browser finance workflows | **Tested/partial.** Fee structure create/edit and duplicate validation; student charge create/edit/delete; individual and bulk discount submission; bulk BUS-charge submission; bill generation, detail, unpaid cancellation/regeneration, partial/full payments, waiver, payment history, and student statement; salary creation/payments; expense create/edit; and UI overpayment validation were exercised. |
| Browser-discovered fixes | The teacher selector is now scoped to the configured school. Bill/salary date pickers now use BS values, and expenses submit their BS date directly. Focused regression tests cover teacher scoping and expense BS-date persistence. No billing calculation logic was changed. |
| QA ledger note | A salary payment entered before the date-picker correction has an incorrect historical date. It was not altered; use an authorized reversal/correction decision rather than silently changing ledger history. UI-generated bills and payments remain in the fictional QA dataset. |
| Final validation | See the validation table below; lint, TypeScript, billing unit tests, and Prisma validation have passed. |

The billing report contains per-scenario results and exact remaining blockers: [BILLING-QA-REPORT.md](./tests/billing/BILLING-QA-REPORT.md).

## Post-reset QA baseline (2026-11-22; billing status superseded by the follow-up above)

The user authorized a destructive reset of the confirmed test-only Neon database and a new fictional dataset. The guarded reset ran against that QA target only, preserved all 15 applied migrations and the database schema, and did not run a migration. This replaces the earlier QA dataset; the pre-reset counts and historical-data findings below are retained as an audit trail, not as statements about current QA records or production data.

The new dataset has 30 seeded students, 5 teachers, 12 classes, 5 subjects, and 6 complete examinations. UI QA added one fictional student and one paid bill. No billing logic or schema was changed.

| Focus | Latest finding |
|---|---|
| Section removal | **Pass.** Source searches find no `/api/sections` requests or `sectionId` references in student workflows. Semantic HTML `<section>` elements remain; legacy database records and columns are preserved outside the explicitly authorized QA-data reset. |
| Accountant login and access | **Pass in QA.** A temporary Accountant authenticated in the browser; prior route smoke coverage returned HTTP 200 for 25 student, academic, examination, results, and financial dashboard routes. The temporary account and its encrypted QA credential were removed after testing. No production credentials or systems were used. |
| Marks and publication | **Pass in browser UI.** The incomplete-publication guard rejected missing marks; saving 50 and explicit 0 for the two students then allowed publication. Four Grade 5 term exams and one Grade 8 exam were also published and locked from the UI. |
| Grades, boundaries, GPA, and position | **Pass in browser UI.** The Grade 5 result table showed all eight grades and all 16 configured percentage test values, including each lower/upper threshold pair. GPA and class positions rendered; Grade 8 results also showed 1st/2nd positions and the expected 3.44/3.36 GPAs. |
| Report cards and print | **Pass in browser UI.** Generated a Grade 5 report card and opened a Grade 8 report card; both displayed subject marks, grades, GPA, and position. Print media hid the print control while retaining the marksheet. |
| Billing UI | **Extended by the follow-up above.** This baseline exercise generated a Baisakh 2083 bill for a fictional student (Rs. 11,700), posted Rs. 1,000 then Rs. 10,700 through the UI, and verified PARTIAL then PAID status, two payment-history rows, and zero remaining. |
| Historic published exams | **Pre-reset QA snapshot only.** The prior inspection found no unassigned scale among 48 published QA exams. Those records were removed by the authorized QA reset; the six new QA exams are published with the approved scale. No production historic exams were examined. The previous Grade 5 missing-mark and legacy-scale observations apply only to that prior QA snapshot. |
| Validation | **Pass.** ESLint (no warnings), TypeScript, 9 focused grading unit tests, 2 QA integration tests, Prisma validation, 15-migration status, and production build. |
| Billing suite | **Latest follow-up: 71 pass, 0 fail, 4 blocked, 0 not executed.** The 47/0/10/13 result was the earlier baseline. See [the billing QA report](./tests/billing/BILLING-QA-REPORT.md). |

## Pre-reset focused verification snapshot (2026-11-22; historical QA data)

The user confirmed the configured Neon database is test-only and authorized targeted QA writes and cleanup. All temporary accounts, exams, and marks created for this refresh were removed. The database returned to 49 exams / 48 published exams; no schema change or migration was made. No production credentials were exposed and no production system was accessed.

| Focus | Latest finding |
|---|---|
| Section removal | **Pass.** No `/api/sections` request or route remains under `src/app`; student registration, enrollment, and profile frontend/API paths contain no `sectionId` references. Legacy schema, migrations, seed references, and generated Prisma fields remain preserved. |
| Accountant setup and access | **Pass in QA.** The provisioning script created disposable `ADMIN` accounts that authenticated as “Accountant.” 25 student, academic, examination, results, and financial dashboard routes returned HTTP 200; the class-subjects route also loaded its assigned data. Anonymous `/api/students` remained 401. Temporary accounts were removed. Session expiry, logout, and recovery were not tested. |
| Grading logic and UI | **Pass in QA.** Marks were entered in the browser for 16 percentages spanning 0, 34.99, 35, 39.99, 40, 49.99, 50, 59.99, 60, 69.99, 70, 79.99, 80, 89.99, 90, and 100. All eight grades rendered correctly. Blank marks were rejected without rows; explicit zero was saved. |
| Publication, results, GPA, position, report cards, and printing | **Pass for the temporary exam.** UI publication locked marks; 8 result rows and 16 subject rows rendered; grade points, average GPA, and all 8 class positions matched expectations. A new report card and an existing report card opened. Print media hid the print controls and retained the marksheet. |
| Historical published exams | **No unassigned scales found.** All 48 pre-existing published exams had a scale assignment. However, the legacy `Grade Scale 1` contains only A+, A, B+, and B; some older marksheets therefore render `N/A`. Four Grade 5 term exams in year 2083 each have 15 missing student-subject mark entries for the currently enrolled cohort. Preserve all published marks and assignments pending evidence and school approval. |
| Billing and migrations | **Baseline only.** The 2026-11-22 billing run reported 47/0/10/13; the 2026-11-23 follow-up above supersedes it with 71/0/4/0. No billing calculation logic or migration changed. |
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
| Production build | **Pass with Webpack.** The default Turbopack `npm run build` attempt timed out in Babel loader worker IPC on the changed client pages; `npm run build -- --webpack` then compiled, type-checked, generated all 58 pages, and completed route tracing. Its route inventory contained no `/api/sections`. |
| Billing QA report | Latest final status after full run and focused retests: 71 passed, 0 failed, 4 blocked, 0 not executed. See [the billing QA report](./tests/billing/BILLING-QA-REPORT.md). |
| Accountant route smoke test | 25 dashboard routes returned HTTP 200. One initial compile timeout was resolved by retrying; class-subjects loaded its data. |
| QA cleanup | Prior grading-test accounts, exams, and marks were cleaned up. The marked billing fixture was removed and its saved test-ID mapping restored. The fictional QA dataset, working Accountant account, and UI-generated financial ledger records were retained. |

No Prisma schema changes or migrations were made, and the destructive production seed was not run.

## End-to-end workflow checklist

Status meanings: **Tested** means exercised through the UI or a focused test; **Partial** means only a subset of the workflow was exercised; **Not tested** means no meaningful execution; **Incomplete** means a product or deployment gap exists.

| Role / workflow | Status | Evidence and remaining coverage |
|---|---|---|
| Accountant sign-in and protected API access | Tested | Provisioned a temporary `ADMIN`/Accountant against isolated QA, logged in, and opened the required student, academic, examination, result, and financial dashboard routes. Anonymous `/api/students` returned 401. Logout, expired sessions, password reset, and recovery were not tested. |
| Student registration and enrollment | Partial | Created a temporary student and Grade 5 enrollment through the UI, then removed the QA record. The school confirmed it does not use sections; section selection was removed from the student UI/profile path while legacy database columns and data are preserved. |
| Student profile and account statement | Partial | Existing student profile showed enrollment, bills, payments, discounts, and a separate `Remaining Due` amount. Profile edit, transfer, and other account-history cases were not exercised. |
| Teacher, class, subject, academic year/term, class-subject, and teacher-assignment management | Partial | Pages and existing records rendered. Create, edit, delete, activation, and relationship validation were not submitted through the UI. |
| Fee structure management | Partial | UI create/edit succeeded and duplicate creation showed HTTP 409; temporary test fees were removed. Deactivation and cross-year UI editing were not tested. Historical snapshots have API-level coverage. |
| Student charges and frequency/date rules | Partial | UI create/edit/delete succeeded; a shared one-student BUS charge was also submitted and removed. Deactivation and every frequency through the UI were not tested; API tests cover MONTHLY, TERM, ANNUAL, ONE_TIME, dates, cancellation replacement, and concurrency. |
| Discounts | Partial | UI individual edit from 12.5% to 15% and a one-student bulk discount succeeded; both test discounts were removed. API coverage includes all seven date/overlap cases and BUS/MISC exclusion; individualized sheet-mode bulk entry was not tested. |
| Bill generation, detail, cancellation, and regeneration | Tested for core flow | Generated bills through the UI, inspected detail, cancelled an unpaid bill, regenerated it, and recorded a partial payment. API tests cover overlap, duplicate requests, charge release, and paid/partial cancellation protection. |
| Student payments and outstanding balances | Tested for core flow | UI partial/full payments, waiver, payment history, zero balance, and student statement were verified. Reversal/refund workflows were not tested. |
| Salary records and salary payments | Partial | Salary creation and partial/full UI payments succeeded. A payment made before the BS date-picker fix has an incorrect historical date and remains untouched pending an authorized correction/reversal decision. |
| Expenses and bulk adjustments | Partial | Expense create/edit succeeded with BS date persistence and temporary expense cleanup. Shared bulk discount and BUS-charge submissions succeeded; sheet-row mode and partial-failure handling were not tested. |
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

The billing follow-up now reports **71 PASS, 0 FAIL, 4 BLOCKED, 0 NOT EXECUTED** after focused retries. Previous dues, multi-year billing, all seven discount date/overlap cases, concurrent payment-plus-waiver, precision boundaries, and available rollback cases were executed. The four blocked cases are E05-E07 and I09: the product has no credit creation/application API, service, or UI, so the credit and credit-rollback behavior cannot be tested. The stress runner calls API handlers directly and does not certify authorization; browser financial workflows are separately documented above.

## Deployment blockers and handoff tasks

1. **Reconcile historical Grade 5 exams.** The four 2083 Term 1–4 examinations each have 15 missing student-subject entries for the current enrolled cohort. Compare with the original roster and authoritative marksheets; restore only source-verified missing marks after school approval. Preserve existing published marks and the locked state.
2. **Resolve legacy grading interpretation.** Recover the complete historical Grade Scale 1 definition or preserved published artifacts, then obtain a documented school decision about the existing `N/A` values. Do not silently alter the pinned scale or grades.
3. **Complete remaining authentication tests.** QA Accountant sign-in and feature access passed, but logout, session expiry, password reset/recovery, and detailed role/API authorization cases remain untested.
4. **Complete production configuration review.** Production values, secret rotation, hosting configuration, and production database target were not available for verification. Keep secrets out of source control and use a separate production database.
5. **Resolve credit feature scope.** Four credit creation/application and credit-rollback scenarios remain blocked because the product exposes no credit business workflow. Implement or formally defer that feature, then run its validation, partial/duplicate-application, and rollback tests before certifying billing fully.
6. **Run a deployment handoff rehearsal.** Validate backups/restore, migration procedure, monitoring/log access, and rollback on a production-like staging deployment. No production deployment or restore drill was performed in this audit.

## Evidence notes

- Database inventory, browser workflows, and integration tests used the user-confirmed isolated QA target. Temporary test accounts/exams/marks were removed; no production system was accessed.
- Direct `node --test` could not resolve the generated Prisma client's extensionless import, including after generation. Running the test with the repository's `tsx` runner after `prisma generate` passed.
- Route smoke testing confirms page rendering, not complete CRUD or financial transaction correctness. Billing browser CRUD and several payment operations remain partial even though the direct-handler billing scenarios are reported separately.
