# Phase 3 Student Management QA Report

**Execution date:** 2026-11-23
**Environment:** Isolated QA database only; no production access or deployment
**Overall result:** Student-management cases passed after two confirmed application defects were fixed and retested. One separate dashboard school-selection defect remains open and was not changed because it is outside this phase's student-management scope.

## Scope and safeguards

- Tested the primary QA school `cmwtatkm10000row42cgw4b64` in the existing isolated QA database (`neondb`). The separate billing school was not used for student test writes.
- No database reset, truncate, reseed, schema change, migration, production access, or deployment occurred.
- Only the clearly identified synthetic students, teachers, assignments, and temporary administrator described below were created. They were removed after testing.
- No pre-existing student, exam, mark, fee, discount, charge, credit, credit-application, bill, payment, or audit record was intentionally modified.
- All financial calculations were left unchanged.

## Fixture and final-state verification

Before testing, the fixture and relevant relationships were checked. Enrollment, class-subject, teacher-assignment, fee, discount, charge, exam, and credit school/year/student/class links had no mismatches. The primary school's API scope contained 52 students, 12 classes, 8 teachers, and 2 academic years.

After cleanup, totals matched the refreshed fixture baseline:

| Record type | Final total |
|---|---:|
| Schools / academic years / terms | 2 / 4 / 16 |
| Classes / sections / subjects | 14 / 4 / 5 |
| Teachers / students / enrollments | 9 / 62 / 112 |
| Class-subjects / teacher assignments | 120 / 120 |
| Exams / marks | 60 / 1,239 |
| Fee structures / discounts / student charges | 129 / 19 / 22 |
| Student credits / credit applications | 2 / 0 |
| Bills / payments | 0 / 0 |

The primary school ended at 52 students, 8 teachers, 12 classes, 2 academic years, and 92 enrollments. The separate billing school remained at 10 students, 1 teacher, 2 classes, 2 academic years, and 20 enrollments. No `QA-PH3-*` students, temporary QA teachers, test assignments, or temporary admin account remained. The original `qa.accountant@example.test` account remained; no password or session token is included here.

The two seeded credits remain:

- `cmwtatw5c00ggrow4mvhdwzti` — amount 750.5, applied amount 0.
- `cmwtatw5c00ghrow4cw61zprr` — amount 125, applied amount 0.

No credit application/audit rows, bills, or payments were created by this phase.

## Test cases

### STU-FIX-01 — Verify fixture and school relationships

- **Preconditions / data:** Existing isolated QA fixture; primary school ID above and separate billing school `cmwtawdr10000scw4moape0b6`.
- **Steps:** Read fixture totals and relationships before testing; compare primary- and billing-school counts; verify enrollment, teacher assignment, fees, charges, discounts, exams, class-subject, and credit references.
- **Expected:** Seeded records and relationships are internally consistent and school-specific test operations target the primary school.
- **Actual:** Expected counts and relationships were present; all checked mismatch counts were zero.
- **Status:** **PASS**
- **Evidence:** Read-only Prisma checks; final counts are listed above.

### STU-REG-01 — Create a student with a manually assigned admission number

- **Preconditions / data:** Signed in to the local QA app; primary school, active year 2083, and Grade 1 available.
- **Steps:** In the student form, create a student with admission number `QA-PH3-MANUAL-A`, name/guardian/contact details, and a Grade 1 enrollment for 2083; read the created profile and API record.
- **Expected:** The student and enrollment are saved with the supplied admission number and fields.
- **Actual:** Creation succeeded. Student ID: `cmwtfscon00009gw4ltcq30d3`. Profile/API reads showed the submitted data and enrollment.
- **Status:** **PASS**
- **Evidence:** Browser form/profile and `/api/students` response.

### STU-REG-02 — Generate an admission number when omitted

- **Preconditions / data:** Signed-in QA session; a second synthetic student with a similar name; admission number left empty.
- **Steps:** Submit the student form without an admission number; inspect the saved student and search results.
- **Expected:** A unique admission number is generated and the record is searchable.
- **Actual:** Student ID `cmwtg6jj900079gw4nt4qguuy` was created with `ADM-0001`; the shared `QA Similar` search returned both similar-name students.
- **Status:** **PASS**
- **Evidence:** Browser form, student list, and API/database read.

### STU-PROF-01 — Edit profile fields and manage yearly enrollments

- **Preconditions / data:** Student `cmwtfscon00009gw4ltcq30d3`; existing 2083 Grade 1 enrollment; 2084 Grade 3 available.
- **Steps:** Edit contact and guardian fields; change the 2083 enrollment from Grade 1 to Grade 2; add a separate 2084 Grade 3 enrollment; reload the profile and inspect the API response.
- **Expected:** Profile changes persist, the same-year enrollment is updated rather than duplicated, and the second-year enrollment is retained independently.
- **Actual:** Changes persisted. The profile/list showed the 2084 Grade 3 enrollment and roll number 903; both academic years were present in API/profile data.
- **Status:** **PASS**
- **Evidence:** Browser edit/reload and `/api/students/:id/profile` responses.

### STU-SRCH-01 — Search similar student names

- **Preconditions / data:** The two synthetic students created above share the query stem `QA Similar`.
- **Steps:** Enter `QA Similar` in the student search field.
- **Expected:** Both matching records appear without confusing one student for the other.
- **Actual:** Both records appeared.
- **Status:** **PASS**
- **Evidence:** Student-list browser result.

### STU-SRCH-02 — Search by phone

- **Preconditions / data:** The edited manual student has phone `5550102`.
- **Steps:** Enter `5550102` in the student search field.
- **Expected:** The matching student is returned.
- **Actual:** Exactly the intended student appeared with the 2084 Grade 3 enrollment.
- **Status:** **PASS**
- **Evidence:** Student-list browser result.

### STU-VAL-01 — Reject invalid registration/update data and unknown IDs

- **Preconditions / data:** Authenticated QA requests; existing fixture remains unchanged.
- **Steps:** Submit invalid names, a fractional roll number, invalid year/class values, a duplicate admission number, and an unknown student ID through the relevant API operations.
- **Expected:** Invalid data is rejected with a client error/conflict and no unintended record is created or changed; unknown IDs return not found.
- **Actual:** Invalid values returned HTTP 400, duplicate admission returned HTTP 409, and unknown student profile/update/delete requests returned HTTP 404.
- **Status:** **PASS**
- **Evidence:** API responses; unknown-ID profile, PATCH, and DELETE requests used `not-a-real-student-id`.

### STU-DOB-01 — Validate impossible and valid dates of birth

- **Preconditions / data:** Synthetic student create/update requests.
- **Steps:** Initially POST `2024-02-31`; inspect the created row. After the fix, repeat invalid DOB create and update requests, and test valid leap date `2024-02-29`.
- **Expected:** Impossible calendar dates are rejected; valid dates are accepted without normalization to a different date.
- **Actual:** **Initial FAIL:** the API accepted `2024-02-31` and stored normalized date `2024-03-02` on synthetic student `cmwtfzaup00039gw44xq4nlac`. This row was later deleted by the pre-fix cascade-delete test (STU-DEL-01); it was not a pre-existing student. A strict shared parser was added; retests reject the invalid value with HTTP 400 on create and update, while the valid leap date succeeds.
- **Status:** **Initial FAIL; fixed and regression retest PASS**
- **Evidence:** Before/after API responses and `tests/student-registration-qa.test.js`.
- **Defect:** Date-of-birth data-integrity validation gap, **Medium (P2)**. Fixed in `src/lib/student-validation.ts`, `src/app/api/students/route.ts`, and `src/app/api/students/[id]/route.ts`.

### STU-DEL-01 — Preserve enrollment history when deleting a student

- **Preconditions / data:** Synthetic student `QA-PH3-INVALID-DOB` (`cmwtfzaup00039gw44xq4nlac`) with one enrollment and no marks, bills, charges, discounts, or credits.
- **Steps:** Initially DELETE that synthetic student; inspect the student and enrollment rows. After the fix, repeat using `QA-PH3-DELETE-GUARD` (`cmwtg4p3b00059gw4dcrvl5jr`) and verify both records remain.
- **Expected:** A student with enrollment history is not deleted through the normal endpoint; the API explains that deletion is blocked.
- **Actual:** **Initial FAIL:** DELETE returned HTTP 200 and cascaded the one enrollment. This affected only the synthetic student created for the test. The route was changed to reject deletion when enrollment history exists. Retest returned HTTP 409 and preserved the synthetic student and enrollment.
- **Status:** **Initial FAIL; fixed and regression retest PASS**
- **Evidence:** Initial and retest DELETE responses, UI error, and database checks.
- **Defect:** Destructive loss of academic enrollment history, **High (P1)**. Fixed in `src/app/api/students/[id]/route.ts`; regression coverage is in `tests/student-registration-qa.test.js`.

### STU-SCOPE-01 — Reject cross-school student writes and scope reads

- **Preconditions / data:** Primary-school session; separate billing school year `cmwtawdyn0001scw482f8701o` and Grade 5 class `cmwtawfxv000bscw4k8zhjl9g`.
- **Steps:** Attempt student creation/update using the billing-school year/class; read the student collection and compare it with primary-school fixture records.
- **Expected:** Cross-school relationships are rejected, and student collection results remain within the primary school.
- **Actual:** Cross-school create/update attempts returned HTTP 400; student reads exposed primary-school records only.
- **Status:** **PASS**
- **Evidence:** API responses and school-scoped read-only database checks.

### STU-AUTH-01 — Check anonymous access to student page and API

- **Preconditions / data:** Browser signed out; no session cookie.
- **Steps:** Request `/api/students` and open `/dashboard/students`.
- **Expected:** The API returns unauthorized and the page redirects to login.
- **Actual:** API returned HTTP 401; page returned a redirect (HTTP 307).
- **Status:** **PASS**
- **Evidence:** API response and browser navigation.

### STU-PROFILE-02 — Verify profile history panels are read-only

- **Preconditions / data:** Synthetic student profile with selected academic year.
- **Steps:** Load the profile and inspect yearly class/roll, examination, and financial sections; do not submit any financial or examination form.
- **Expected:** The selected-year enrollment is shown; the view does not create or change financial/examination records.
- **Actual:** Selected-year class/roll and read-only exam/financial panels rendered. No financial or examination rows were written.
- **Status:** **PASS**
- **Evidence:** Browser profile and unchanged final counts for marks, fees, charges, discounts, credits, applications, bills, and payments.

### ACA-TA-01 — Retest required teacher-assignment multiplicity

- **Preconditions / data:** Two temporary primary-school teachers; Grade 1/Grade 2 class-subject relationships.
- **Steps:** Assign one teacher to multiple subjects/classes, assign a second teacher to Grade 1 English, retry an exact duplicate, and submit an assignment without a configured class-subject relation.
- **Expected:** Distinct valid assignments are allowed; exact duplicates and missing class-subject links are rejected.
- **Actual:** Four distinct assignments succeeded; duplicate returned HTTP 409; missing class-subject relation returned HTTP 400. Temporary assignment IDs were `cmwtg9k7k000b9gw4mgyl49u2`, `cmwtg9m7v000c9gw4y0qkij5y`, `cmwtg9o8m000d9gw4tng02j0m`, and `cmwtg9q9t000e9gw4kvig0585`.
- **Status:** **PASS**
- **Evidence:** API responses and final 120-assignment fixture count.

### STU-CLEAN-01 — Remove only test-created records and verify baseline

- **Preconditions / data:** Exact IDs and expected synthetic admission numbers known; dependent-row counts inspected before cleanup.
- **Steps:** Delete the four test assignments and two temporary teachers through their APIs; confirm the three remaining test students had only enrollments and zero marks/bills/charges/discounts/credits; remove those exact synthetic enrollment/student rows; remove the temporary admin after verifying it had no credit audit relationships; rerun fixture counts.
- **Expected:** Test-created records are removed, pre-existing records and credit/audit history remain, and the baseline is restored.
- **Actual:** API cleanup returned HTTP 200 for four assignments and two teachers. Three synthetic students and four enrollment rows were removed by exact ID after dependency verification. The temporary admin was removed; the original QA Accountant account remained. Final counts match the fixture baseline.
- **Status:** **PASS**
- **Evidence:** Exact-ID preflight and cleanup results; final Prisma totals above.

## Defects and separate follow-up observations

1. **DOB validation — Medium (P2), fixed and retested.** See STU-DOB-01.
2. **Enrollment-history cascade delete — High (P1), fixed and retested.** See STU-DEL-01.
3. **Dashboard displayed the wrong school's data — Medium (P2), open at Phase 3 completion and resolved in the 2026-11-24 remediation.** During the temporary-admin browser session, `/dashboard` displayed `BILL_QA_2083 Test School` and its statistics while student pages/APIs used the primary QA school. The dashboard now uses the shared configured-school selector and explicitly scopes school-dependent statistics. See [SINGLE-SCHOOL-REMEDIATION-REPORT.md](./SINGLE-SCHOOL-REMEDIATION-REPORT.md).
4. **Teacher-assignment cross-school consistency — unverified at Phase 3 completion and addressed in the 2026-11-24 remediation.** Assignment create/read/delete paths now validate or scope teacher, class, and academic year to the configured school, and the exact class-subject-year relation is required. Unit tests cover valid multiplicity and invalid school relationships; no database-backed route test was run in the follow-up. See [SINGLE-SCHOOL-REMEDIATION-REPORT.md](./SINGLE-SCHOOL-REMEDIATION-REPORT.md).

## Unsupported or not executed

- No student active/inactive/archive field or workflow exists; **NOT EXECUTED**.
- Section selection is not required by the finalized school decision and is absent from the student form; no section behavior was changed.
- Broader non-ADMIN authorization, password recovery, examination/result editing, and finance CRUD are outside this phase. Financial calculations and data were not modified.

## Harness notes and validation

- Slow initial page loads and a `pg` overlapping-query deprecation warning were test-environment/runtime observations, not application test failures.
- A cleanup transaction first exceeded Prisma's default 5-second timeout before its delete statements; it rolled back. Exact IDs/dependencies were rechecked, and cleanup succeeded in a guarded transaction with a longer timeout. A subsequent verification query initially selected a nonexistent `schoolId` field from `User`; it made no write, was corrected, and confirmed the expected remaining account.
- Focused guarded regression: `node --import tsx --test tests/student-registration-qa.test.js` — **1/1 passed** against the explicitly verified QA target.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build -- --webpack` — passed; this was a local build only, not a deployment.
- No commit or push was made.
