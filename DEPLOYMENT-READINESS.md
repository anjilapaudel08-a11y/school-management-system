# Deployment Readiness Report

**Assessment date:** 2026-11-22  
**Decision:** **Not ready for school deployment yet.** The application builds and the tested core flows work, but authorization policy, section enrollment, production environment setup, and several untested workflows still need resolution.

## Verification summary

| Area | Result |
|---|---|
| ESLint | Pass: 0 errors, 0 warnings |
| TypeScript | Pass: `npx tsc --noEmit` |
| Production build | Pass: `npm run build` |
| Prisma migrations | Pass: 14 migrations found; isolated QA database is up to date |
| Grade-scale unit tests | Pass: 4/4 |
| Academic-risk QA test | Pass: 1/1 against the isolated QA database |
| Billing QA report | Prior run: 47 passed, 0 failed, 10 blocked, 13 not executed. The broad billing suite was not rerun during this audit. See [the billing QA report](./tests/billing/BILLING-QA-REPORT.md). |
| Browser route smoke test | 27 dashboard routes returned HTTP 200; representative pages were allowed to finish loading and their visible data was inspected. |
| Temporary QA data | The UI-created `Deploy QA Student` and its enrollment were removed after verification; the student list returned to 63 records. It had no bills, charges, or discounts. |

No Prisma schema changes or migrations were made during this audit. The destructive production seed was not run.

## End-to-end workflow checklist

Status meanings: **Tested** means exercised through the UI or a focused test; **Partial** means only a subset of the workflow was exercised; **Not tested** means no meaningful execution; **Incomplete** means a product or deployment gap exists.

| Role / workflow | Status | Evidence and remaining coverage |
|---|---|---|
| Admin sign-in and protected API access | Partial | QA Admin login succeeded; anonymous `/api/students` returned 401. Logout, expired sessions, password reset, and account recovery were not tested. |
| Student registration and enrollment | Partial | Created a temporary student and Grade 5 enrollment through the UI, then removed the QA record. **Section selection is incomplete:** the UI requests `/api/sections`, which returns 404 when authenticated, so sectioned enrollment cannot be completed. |
| Student profile and account statement | Partial | Existing student profile showed enrollment, bills, payments, discounts, and a separate `Remaining Due` amount. Profile edit, transfer, and other account-history cases were not exercised. |
| Teacher, class, subject, academic year/term, class-subject, and teacher-assignment management | Partial | Pages and existing records rendered. Create, edit, delete, activation, and relationship validation were not submitted through the UI. |
| Fee structure management | Partial | Fee form and existing fee data rendered. Fee create/edit/deactivation was not submitted through the UI. Historical fee snapshots are covered by prior billing QA scenarios. |
| Student charges and frequency/date rules | Partial | Charge form rendered. UI create/edit/deactivate was not submitted. Prior isolated billing QA covered MONTHLY, TERM, ANNUAL, ONE_TIME, date eligibility, replacement after unpaid cancellation, and concurrent bill generation. |
| Discounts | Partial | Discount form and configured discount rendered. The basic discount calculations were covered by prior billing QA, but discount date-boundary and overlap cases remain untested. |
| Bill generation, detail, cancellation, and regeneration | Partial | Bills list and an existing bill detail rendered, including line items and balances. Bill creation/cancellation were not submitted through the UI. Prior billing QA covered overlapping periods, duplicate requests, charge release on unpaid cancellation, and payment-protected cancellation. |
| Student payments and outstanding balances | Partial | Payment history and the original bill's remaining amount rendered in the UI. Posting or reversing a payment through the UI was not tested. Payment idempotency, partial/full settlements, waivers, and concurrency have prior API-level QA evidence. |
| Salary records and salary payments | Partial | Salary list showed gross Rs. 18,000, paid Rs. 12,000, and remaining Rs. 6,000. The concurrent salary-payment regression test passed. A salary/payment submission through the UI was not tested. |
| Expenses and bulk adjustments | Partial | Both forms and student choices rendered. No expense or bulk adjustment was submitted. |
| Exams and marks | Partial | Exam pages rendered; the Marks page loaded saved Grade 8 / Term 4 marks after selecting the UI filters. Mark entry/save, exam creation, publish, and rejection behavior were not submitted through the UI. Exam protection and concurrent salary-payment behavior passed the isolated academic-risk test. |
| Results, GPA, and marksheet | Tested | Calculated results through the UI for Term 4 / Grade 8 and opened a report card from the results list. Five students appeared; the report showed percentages, GPA, and class position. |
| School settings | Partial | Settings form rendered; save and validation were not tested. |
| Board Member authorization | Not tested / incomplete | The schema defines `ADMIN` and `BOARD_MEMBER`, but no separate permission matrix was verified. |
| Accountant authorization | Incomplete | There is no `ACCOUNTANT` role in the schema. Add it only if the school requires a distinct accountant role. |

### Results and grade-scale configuration

The UI results and report-card workflow completed. The current QA Grade Scale 1 contains ranges only for 60-100%; a 56.76% result therefore displays grade `N/A` while still showing GPA 1.36. Confirm the school's intended failing-grade ranges and configure a complete scale before issuing report cards. Grade-scale validation tests cover rejection of empty, gapped, and overlapping ranges, but do not repair an existing incomplete scale automatically.

## Billing evidence and limitations

The user's confirmed frequency rules are reflected in the prior isolated QA report: MONTHLY is rate x quantity x eligible months; TERM, ANNUAL, and ONE_TIME are rate x quantity once on the first eligible bill. No billing calculations, API logic, or schema were changed in this audit.

Prior QA examples:

- An unpaid first bill remained at Rs. 26,700; the next bill contained only new charges totaling Rs. 17,300. The statement showed Rs. 44,000 outstanding across the original bills without carrying the earlier charge forward.
- With a Rs. 100 partial payment, the first bill's remaining amount stayed on that bill; the next bill was Rs. 17,300 and the statement total was Rs. 43,900.
- The frequency test verified monthly quantity 3 = Rs. 4,500, term quantity 2 = Rs. 800, annual quantity 3 = Rs. 600, and a one-time amount of Rs. 700.

The prior billing suite had no failures among executed scenarios, but it is not complete:

- **Blocked (10):** previous-dues/credit application scenarios and injected transaction rollback cases.
- **Not executed (13):** multi-year billing, seven discount-date/overlap cases, concurrent payment-plus-waiver, and decimal/small/large/zero-value amounts.
- The billing runner calls API handlers directly; it does not certify browser workflows or authorization.

## Deployment blockers and handoff tasks

1. **Resolve sections support.** Implement and test `/api/sections` end-to-end, or remove/disable section selection if sections are not used. Do not silently treat the 404 as “no sections.”
2. **Approve an authorization model.** Confirm whether the school needs only Admin access or separate Board Member/Accountant permissions. Implement and test server-side authorization for every protected API; authentication alone currently gates API access.
3. **Complete production configuration review.** Only local `DATABASE_URL` and `AUTH_SECRET` names were present in `.env`; production values, secret rotation, hosting configuration, and production database target were not available for verification. Keep secrets out of source control and use a separate production database.
4. **Approve grading ranges.** Confirm how percentages below 60% should be graded, update the school's scale, and verify GPA/grade output in report cards.
5. **Complete UI transaction tests.** In a staging database, submit and verify fee/charge/discount changes, bill generation/cancellation/replacement, payment/waiver entry, salary payment, expense entry, bulk adjustments, mark save/publish, and school-setting save. Verify resulting database state and audit history, not just success messages.
6. **Close billing coverage gaps.** Either implement the missing credit/previous-dues workflows if required or mark them explicitly out of scope; add the blocked rollback and unexecuted precision/date-boundary tests before certifying billing fully.
7. **Run a deployment handoff rehearsal.** Validate backups/restore, initial Admin provisioning, migration procedure, monitoring/log access, and rollback on a production-like staging deployment. No production deployment or restore drill was performed in this audit.

## Evidence notes

- The local `.env` target was checked against the previously approved isolated QA target; no production database was used.
- Direct `node --test` could not resolve the generated Prisma client's extensionless import, including after generation. Running the test with the repository's `tsx` runner after `prisma generate` passed.
- Route smoke testing confirms page rendering, not complete CRUD or financial transaction correctness. Items marked Partial must not be represented as fully end-to-end tested.
