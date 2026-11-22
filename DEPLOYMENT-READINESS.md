# Deployment Readiness Report

**Assessment date:** 2026-11-22  
**Decision:** **Not ready for school deployment yet.** The application builds, all 15 migrations are applied to the isolated QA database, and targeted grading checks pass. The Accountant provisioning path has not been run, and multiple user workflows and production controls remain unverified.

## Verification summary

| Area | Result |
|---|---|
| ESLint | Pass: 0 errors, 0 warnings |
| TypeScript | Pass: `npx tsc --noEmit` |
| Production build | Pass: `npm run build` |
| Prisma schema | Pass: `npx prisma validate`; generated client successfully |
| Prisma migrations | Pass: all 15 migrations, including `20261122200000_pin_exam_grading_scale`, are applied to the isolated QA database; `npx prisma migrate status` reports up to date. |
| Grade calculation and validation tests | Pass: 9/9, including all approved thresholds, raw percentage behavior, legacy inclusive scale behavior, and performance labels |
| Academic-risk QA test | Pass: 1/1 against the isolated QA database. Exam publication pinned the default scale; a recorded zero produced NG; 179.99/200 produced 89.995% and grade A; missing marks blocked publication. |
| Lint / TypeScript / production build | Pass: `npm run lint`, `npx tsc --noEmit`, and `npm run build` |
| Billing QA report | Prior run: 47 passed, 0 failed, 10 blocked, 13 not executed. The broad billing suite was not rerun during this audit. See [the billing QA report](./tests/billing/BILLING-QA-REPORT.md). |
| Browser route smoke test | 27 dashboard routes returned HTTP 200; representative pages were allowed to finish loading and their visible data was inspected. |
| Temporary QA data | The UI-created `Deploy QA Student` and its enrollment were removed after verification; the student list returned to 63 records. It had no bills, charges, or discounts. |

No Prisma schema changes or migrations were made during this audit. The destructive production seed was not run.

## End-to-end workflow checklist

Status meanings: **Tested** means exercised through the UI or a focused test; **Partial** means only a subset of the workflow was exercised; **Not tested** means no meaningful execution; **Incomplete** means a product or deployment gap exists.

| Role / workflow | Status | Evidence and remaining coverage |
|---|---|---|
| Admin sign-in and protected API access | Partial | QA Admin login succeeded; anonymous `/api/students` returned 401. Logout, expired sessions, password reset, and account recovery were not tested. |
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
| Exams and marks | Partial | Exam pages rendered; the Marks page loaded saved Grade 8 / Term 4 marks after selecting the UI filters. Mark entry/save, exam creation, publish, and rejection behavior were not submitted through the UI. |
| Results, GPA, and marksheet | Partial | The earlier UI run calculated Term 4 / Grade 8 results and opened a report card. Raw threshold behavior, variable full marks, zero-versus-missing marks, and exam-to-scale pinning passed unit/API QA tests. The updated performance-label display and report card were not re-tested in a browser. |
| School settings | Partial | Settings form rendered; save and validation were not tested. |
| Accountant sign-in and access | Partial | A one-time provisioning script creates the Accountant as `ADMIN`, the existing full-access account type, with a bcrypt-hashed password. The script was not run and login/access was not re-tested. `ADMIN` is shown as “Accountant” in the dashboard. |
| Board Member authorization | Not applicable to the confirmed operating model / untested | The school confirmed one operational Accountant and no need for separate teacher/board logins. Existing `BOARD_MEMBER` enum values remain for compatibility; no role-permission redesign was made. |

### Results and grade-scale configuration

The approved default scale has thresholds A+ 90-100, A 80-<90, B+ 70-<80, B 60-<70, C+ 50-<60, C 40-<50, D 35-<40, and NG 0-<35, with grade points 4.0, 3.6, 3.2, 2.8, 2.4, 2.0, 1.6, and 0.0. Grade choice uses the raw percentage; display formatting does not influence it. Published exams save their scale so later scale edits/deletion cannot rewrite historical results. Existing published exams are linked to the former scale only when exactly one legacy scale exists; if multiple scales existed during migration, those exams remain unassigned and results are intentionally blocked until an explicit historical assignment is made. The approved scale is seeded by migration and is not editable/deletable.

The current result method remains unchanged: each subject uses its own theory/practical full marks; GPA is the arithmetic mean of subject grade points (including NG as zero); overall percentage and overall grade use total obtained marks divided by total full marks. Publication requires an actual mark row for every student/subject; a saved zero is therefore a real NG result, not a missing mark.

## Billing evidence and limitations

The user's confirmed frequency rules are reflected in the prior isolated QA report: MONTHLY is rate x quantity x eligible months; TERM, ANNUAL, and ONE_TIME are rate x quantity once on the first eligible bill. No billing calculations, API logic, or schema were changed in this phase.

Prior QA examples:

- An unpaid first bill remained at Rs. 26,700; the next bill contained only new charges totaling Rs. 17,300. The statement showed Rs. 44,000 outstanding across the original bills without carrying the earlier charge forward.
- With a Rs. 100 partial payment, the first bill's remaining amount stayed on that bill; the next bill was Rs. 17,300 and the statement total was Rs. 43,900.
- The frequency test verified monthly quantity 3 = Rs. 4,500, term quantity 2 = Rs. 800, annual quantity 3 = Rs. 600, and a one-time amount of Rs. 700.

The prior billing suite had no failures among executed scenarios, but it is not complete:

- **Blocked (10):** previous-dues/credit application scenarios and injected transaction rollback cases.
- **Not executed (13):** multi-year billing, seven discount-date/overlap cases, concurrent payment-plus-waiver, and decimal/small/large/zero-value amounts.
- The billing runner calls API handlers directly; it does not certify browser workflows or authorization.

## Deployment blockers and handoff tasks

1. **Verify legacy grading assignments after migration.** Published exams were automatically linked to the former scale only when exactly one legacy scale existed. Verify that result in the QA database; if there were multiple old scales, explicitly resolve each unassigned exam before deployment.
2. **Provision and verify the Accountant account** using `npm run provision:accountant` with exact host/database confirmation and strong credentials supplied through environment variables; test sign-in, session expiry/logout, and all required dashboard/API access.
3. **Complete UI transaction tests.** In staging, submit and verify fee/charge/discount changes, bill generation/cancellation/replacement, payment/waiver entry, salary payment, expense entry, bulk adjustments, mark save/publish, grade output/report card, and school-setting save. Verify persisted state, not just success messages.
4. **Complete production configuration review.** Production values, secret rotation, hosting configuration, and production database target were not available for verification. Keep secrets out of source control and use a separate production database.
5. **Close billing coverage gaps.** Prior billing QA had 10 blocked and 13 unexecuted cases. Resolve previous-dues/credit scope and run transaction rollback, multi-year, discount-boundary, concurrent payment-plus-waiver, and amount precision cases before certifying billing fully.
6. **Run a deployment handoff rehearsal.** Validate backups/restore, migration procedure, monitoring/log access, and rollback on a production-like staging deployment. No production deployment or restore drill was performed in this audit.

## Evidence notes

- Database migration and integration tests used the previously confirmed isolated QA target; the test harness guard values were created only for the test process and removed afterward.
- Direct `node --test` could not resolve the generated Prisma client's extensionless import, including after generation. Running the test with the repository's `tsx` runner after `prisma generate` passed.
- Route smoke testing confirms page rendering, not complete CRUD or financial transaction correctness. Items marked Partial must not be represented as fully end-to-end tested.
