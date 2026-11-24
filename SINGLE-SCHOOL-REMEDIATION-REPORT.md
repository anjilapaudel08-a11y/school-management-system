# Single-School and Assignment Remediation Report

**Date:** 2026-11-24 (final source, unit, database, and prior browser evidence)
**Scope:** Enforce one configured school in normal application workflows, correct dashboard school selection, and validate teacher assignments.
**Database safety:** Only the existing isolated QA database was used. No production access, reset, reseed, migration, or historical-record modification occurred.

## Implementation and configuration

- `getConfiguredSchool()` is the shared selector used by the dashboard, school-scoped APIs, and credit workflows. It never uses an unordered `school.findFirst()`. A configured `SCHOOL_ID` explicitly identifies the intended record; without it, exactly one record may be used. Multiple records in production always raise a clear configuration error, even if `SCHOOL_ID` is set.
- The isolated QA database contains two intentionally distinct records: primary school `cmwtatkm10000row42cgw4b64` and artificial billing-test school `cmwtawdr10000scw4moape0b6`. The QA app uses the primary ID as deployment/test configuration. This is not a school selector or multi-school feature; normal users cannot see or switch to the billing-test school.
- `/api/school` is the only normal school-creation path. Initial setup creates when none exists; transaction-level advisory locking serializes concurrent setup; later submissions update the configured record. There is no school deletion or switching interface/API. Missing setup returns an explicit API error and dashboard guidance; lookup does not create a school.
- Direct school-record lookups and creation in `src` are centralized in `src/lib/school.ts`; source search found no other `school.findFirst()`, school create, or school deletion call. School-dependent routes and credit workflows use the shared helper.
- Dashboard school name/profile and student, teacher, class, active-year, enrollment, and outstanding-bill queries are scoped to the configured school. Enrollment and bill counts also verify the linked student and class belong to that school.
- A final source review found additional school-owned finance and academic APIs that had trusted requested IDs or lacked configured-school relation filters. Those routes now constrain reads and writes to the configured school, including finance aggregates, bills/payments/expenses/fees, student charges/discounts/credits, salaries, academic terms/years/classes, exams/marks/results, and nested student/teacher data. Academic-year activation also rejects a foreign-school year before changing any active flags.
- The root page no longer queries or displays a count of all schools; it redirects to login. This avoids exposing the artificial QA school through a public page and removes a database-dependent static-prerender operation.
- Teacher-assignment GET/DELETE are school-scoped. POST validates teacher, class, academic year, and the exact class-subject-year relation before writing. Valid assignments across multiple subjects and classes remain allowed; exact duplicates conflict. `Subject` is a shared catalog model, so its relationship is validated through the configured school's class and year.

## Final verification

| Requirement | Evidence level | Result |
|---|---|---|
| Single-school setup and school-count safety | **Source-reviewed, unit-tested, database/browser-verified.** Mock tests prove create-once/update-on-repeat. Authenticated school settings GET and two updates returned 200, with the same school ID on every response. The guarded database check still found exactly the two pre-existing QA school records. |
| No creation/deletion/switching outside setup | **Source-reviewed.** School creation exists only in the initial setup branch of the settings API. No school DELETE route, school-switch API, or selector was found. `SCHOOL_ID` is deployment/test configuration, not user-facing functionality. |
| Duplicate-record behavior | **Unit-tested.** QA/dev requires an explicit ID when multiple records exist; an invalid ID fails. Production rejects multiple records regardless of ID instead of selecting the earliest. |
| Consistent configured-school selection | **Source-audited.** No direct or unordered `school.findFirst()` remains outside the shared helper; school-dependent modules use `getConfiguredSchool()`. |
| School settings GET/update | **Database/browser-verified.** Logged-in settings page and `/api/school` GET loaded the primary profile. Repeated profile updates returned success and retained the same primary school ID; total school count remained two. |
| Dashboard statistics and school data | **Database/browser-verified.** Dashboard showed “QA Academy - Fictional Test School”, 52 students, 8 teachers, 12 classes, active year 2083, 52 enrolled this year, and 0 outstanding bills. Authenticated student/teacher/class/academic-year APIs and guarded QA queries matched those values. Database counts for active-year enrollments and outstanding bills used the same school-linked predicates as the dashboard. |
| School-owned API scoping | **Source-reviewed and database-tested.** Guarded QA API tests verified school-owned academic and finance list/detail filters do not return artificial-school records; foreign academic years/classes/exams are rejected. The finance-overview API's income, waiver, salary, expense totals, and counts matched direct primary-school-only database aggregates. Rejected foreign-year activation left both schools' active-year state unchanged. |
| Missing configuration | **Mocked-database/API-tested; UI source-reviewed.** With authenticated access and a mocked empty school lookup, `/api/school` returned HTTP 404 with the setup-required error; the selector returned no school and did not create one. Dashboard source renders setup guidance. The live QA database was not emptied to test this case. |
| Teacher-assignment relationships and multiplicity | **Unit- and database-tested.** 10 focused school/assignment tests passed. Guarded QA route test created and read two valid assignments across different classes and subjects, rejected exact duplicates (409), cross-school teacher/class/year combinations, and a subject not configured for the class/year; rejected writes left assignment counts unchanged. Both valid assignments were deleted and temporary records cleaned up. |
| Student-registration regression | **Database-tested.** Guarded registration regression passed; temporary students were cleaned up. |
| QA billing fixture and financial records | **Database-snapshot-verified.** The assignment integration test compared the artificial billing-school record and its school-owned fixtures, plus snapshots of financial tables, before and after; hashes matched. The API-scope test also confirmed both school records remained present and foreign school academic-year state did not change. No billing/payment/credit calculation or historical financial record was changed. |

### Local validation

- `npm run lint` — passed with no errors or warnings.
- `npm run build -- --webpack` — passed.
- `npx tsc --noEmit` — passed after the build.
- `node --import tsx --test tests/school-configuration.test.js tests/teacher-assignment-validation.test.ts` — 10 passed, 0 failed.
- Guarded isolated-QA tests: `tests/teacher-assignment-qa.test.js`, `tests/student-registration-qa.test.js`, and `tests/school-api-scope-qa.test.js` — 3 passed, 0 failed. The scope test is read-only except for a rejected foreign-school activation request and compares finance-overview totals to primary-school-filtered database aggregates.
- The authenticated browser verification previously recorded above was not repeated after the final API-wide scope changes; the user chose to rely on that prior browser evidence. The final API data-scope and finance aggregate behavior were database-tested separately.

The assignment QA run emitted a `pg` overlapping-query deprecation warning, but passed. The missing-school API check used Node's experimental module mocking in an isolated process; it did not connect to or alter a database. Build and QA checks are verification only, not a deployment.

No Phase 4 work was started. Phase 4 remains on hold until the user reviews and approves this report.
