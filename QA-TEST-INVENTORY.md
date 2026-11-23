# QA Test Inventory and Phases 1-3

**Baseline:** Isolated QA database reset and reseeded on 2026-11-23.
**Execution scope:** Reset/fixture verification and Phases 1–3 are complete with partial feature coverage. The refreshed billing regression remains pending.

## Master inventory

Every workflow uses one of these exact classifications: `NOT TESTED`, `PARTIALLY TESTED`, or `REGRESSION RETEST`. `REGRESSION RETEST` means earlier evidence passed before the latest QA reset, so that evidence does not certify the refreshed database or its new account.

| Area | Status | Evidence / remaining coverage |
|---|---|---|
| Authentication, session lifecycle, and protected APIs | PARTIALLY TESTED | Phase 1 retested valid/invalid credentials, session persistence/expiry, protected pages/APIs, logout, and credit-page/API authorization. Broad non-ADMIN page/API coverage remains outstanding. The direct credit-page role gap was fixed and retested. In-app password recovery is not implemented. See [QA-PHASE1-AUTH-REPORT.md](./QA-PHASE1-AUTH-REPORT.md). |
| Student registration and enrollment | PARTIALLY TESTED | Phase 3 verified manual/generated admission numbers, validation, year/class enrollment updates, cross-school scope, and deletion safeguards. Impossible DOB normalization and enrollment-history cascade deletion were fixed and retested. Broader CRUD and boundary coverage remain. See [QA-PHASE3-STUDENT-REPORT.md](./QA-PHASE3-STUDENT-REPORT.md). |
| Student profiles and account statements | PARTIALLY TESTED | Phase 3 verified contact/guardian edits, persistence, multi-year enrollments, similar-name and phone search, and read-only profile history panels. Full statement/payment workflows remain in finance coverage. |
| School settings | PARTIALLY TESTED | Primary-school settings load, update, reload, and invalid-input checks passed after fixes. The no-school initial setup case and infrastructure CRUD remain untested. See [QA-PHASE2-ACADEMIC-REPORT.md](./QA-PHASE2-ACADEMIC-REPORT.md). |
| Academic years/terms, classes, subjects, and assignments | PARTIALLY TESTED | Phase 2 retested supported management paths; Phase 3 behaviorally verified multiple teacher/class/subject assignments, duplicate rejection, and missing class-subject rejection. Cross-school assignment ownership remains a separate follow-up. Term date boundaries are required but deferred. Routine academic-year editing is not required; class/subject/teacher activation is desirable. Sections are not required for operations. See [QA-PHASE2-ACADEMIC-REPORT.md](./QA-PHASE2-ACADEMIC-REPORT.md), [QA-PHASE3-STUDENT-REPORT.md](./QA-PHASE3-STUDENT-REPORT.md), and [SCHOOL-ACADEMIC-FOLLOW-UP-BACKLOG.md](./SCHOOL-ACADEMIC-FOLLOW-UP-BACKLOG.md). |
| Fees, student charges, discounts, bill generation, payments, waivers, and finance statements | REGRESSION RETEST | The pre-reset stress report records 71 PASS, 0 FAIL, 0 BLOCKED, 4 NOT EXECUTED by that runner; gated credit tests passed separately. The new billing fixture mapping was regenerated, but no stress or integration tests have run after reset. |
| Student credit issuance, application, idempotency, and reversal | REGRESSION RETEST | Prior gated integration and browser coverage passed. New QA credit rows were seeded, but credit integration was not rerun. |
| Teacher records and assignments | PARTIALLY TESTED | Phase 2 retested teacher create/edit/validation and assignment management; Phase 3 verified multiple distinct assignments, exact duplicate rejection, and missing class-subject rejection. Deactivation and direct assignment editing are unsupported; cross-school consistency remains unverified. |
| Teacher salaries and salary payments | PARTIALLY TESTED | Prior browser create/payment flows and rollback coverage; UI edge cases and retest after reset remain. |
| Expenses | REGRESSION RETEST | Prior BS-date integration check and UI create/edit passed; the fresh fixture has 10 synthetic expenses, but tests were not rerun. |
| Exams, marks, grade scales, calculations, results, and report cards | REGRESSION RETEST | Prior boundary/GPA/position QA passed; focused tests exist in `tests/grade-scale-validation.test.ts`, `tests/grade-calculation.test.ts`, and `tests/academic-risk-qa.test.js`. The reset created new exams/marks; UI and integration regression remain. |
| Infrastructure | PARTIALLY TESTED | Infrastructure records were seeded but CRUD remains untested. |
| Bulk student adjustments | PARTIALLY TESTED | Prior shared bulk discount and BUS-charge submissions passed; sheet-row mode and partial-failure behavior remain untested. |
| Production configuration, backup/restore, deployment, and recovery | NOT TESTED | Explicitly out of scope; no production access, deployment, or restore rehearsal occurred. |
| Comprehensive non-ADMIN authorization across ADMIN-only pages and APIs | NOT TESTED | Deferred authorization matrix; do not change role behavior during Phase 3. |
| Separate ADMIN/ACCOUNTANT role implementation and testing | NOT TESTED | Future implementation requirement only; current role definitions and QA Accountant account must remain unchanged during Phase 3. |
| In-app password change/reset/recovery | NOT TESTED | Not implemented in the inspected app; remains a product gap outside Phase 3. |

## Future ADMIN/ACCOUNTANT permission specification

This is the finalized requirement for a later implementation phase. It is documentation only; do not change authentication, authorization, role definitions, or the existing QA Accountant account during Phase 3.

**ADMIN**
- Full access to every application feature.
- Full control over user accounts, roles, permissions, and sensitive system administration.
- Full access to academic, student, examination, and financial modules.

**ACCOUNTANT**
- Full operational access to student, teacher, academic, examination, results, and financial modules.
- Full create, read, update, and delete permissions wherever supported.
- Independent management of academic years, terms, classes, subjects, class-subject assignments, and teacher assignments.
- No access to user account management, role/permission management, or sensitive system administration.
- Dashboard should be practically identical to ADMIN's, except for ADMIN-only controls.

## Finalized school and academic decisions (2026-11-23)

| Workflow / capability | Classification | Decision and current evidence |
|---|---|---|
| Operational section management and section selection | **NOT REQUIRED** | Do not add section management or require sections for new enrollments. Preserve existing section-linked enrollment history and schema/data during QA. Any schema/code cleanup is a separate, reviewed task. |
| Academic-term date boundaries | **REQUIRED** | Terms must have date boundaries. The current model has no term start/end fields; implementation and validation belong in the academic-management follow-up, not Phase 3 unless student management directly depends on them. |
| Multiple teacher/class/subject assignments | **REQUIRED** | A teacher must be assignable to multiple subjects/classes, with exact-duplicate prevention and valid class-subject relationships. Current schema/API/UI appear to support independent assignments; behavioral regression verification is still pending. |
| Routine academic-year editing | **NOT REQUIRED** | Do not add a routine edit workflow. The current app has no academic-year edit UI/API. Any exceptional correction should first assess dependent records and use a controlled, auditable correction path; do not rewrite history casually. |
| Teacher, class, and subject activation | **DESIRABLE** | Lower-priority capability. These models currently have no activation field/control; do not expand Phase 3 to add one. |
| ADMIN/ACCOUNTANT separation and comprehensive non-ADMIN authorization | **REQUIRED for the future role implementation** | Preserve the permission specification above and the deferred authorization backlog; do not change roles during Phase 3. |
| In-app password recovery | **EXISTING IMPLEMENTATION LIMITATION** | No in-app password-change/reset/recovery flow was found. Keep this documented as a product gap; it is outside Phase 3. |

The implementation backlog and safe section-cleanup assessment are tracked in [SCHOOL-ACADEMIC-FOLLOW-UP-BACKLOG.md](./SCHOOL-ACADEMIC-FOLLOW-UP-BACKLOG.md).

## Phase 1: authentication scope

These are the only tests included in Phase 1. Actual steps and outcomes are recorded in [QA-PHASE1-AUTH-REPORT.md](./QA-PHASE1-AUTH-REPORT.md). Use only the isolated QA target and synthetic accounts; do not write credentials or session tokens to reports.

| ID | Test | Expected result |
|---|---|---|
| AUTH-01 | Sign in with `qa.accountant@example.test` and the rotated one-time QA password. | Credentials are accepted; a session is established and the user reaches the dashboard. |
| AUTH-02 | Sign in with the correct email and an incorrect password. | Sign-in is rejected with a neutral invalid-credentials message; no session is issued. |
| AUTH-03 | Sign in with an unknown email and a syntactically valid password. | Same externally visible rejection as AUTH-02; no session is issued. |
| AUTH-04 | Submit blank email/password and POST missing credentials to the callback. | Browser required-field validation blocks the blank form; server callback returns a credentials error and no session. |
| AUTH-05 | Open dashboard pages signed out and signed in. | Signed-out navigation redirects to `/login`; ADMIN navigation renders protected pages. |
| AUTH-06 | Read the authenticated session after sign-in and reload. | Session contains the expected user ID and `ADMIN` role without password/hash. |
| AUTH-07 | Call protected read and write APIs without a session. | Requests return HTTP 401 and do not mutate QA data. |
| AUTH-08 | Call `/api/students` and `/api/student-credits` as ADMIN. | Both authorized reads return HTTP 200 and seeded records. |
| AUTH-09 | Call student-credit GET/POST APIs using a signed `BOARD_MEMBER` session. | Both return HTTP 403; no database user or credit record is created. |
| AUTH-10 / AUTH-10R | Open the ADMIN-only credit page directly as `BOARD_MEMBER`, then retest after the page guard. | Non-ADMIN redirects to `/dashboard`; ADMIN still accesses the page. |
| AUTH-11A / AUTH-11B | Send an expired session token to `/api/students`. | A sufficiently expired token returns HTTP 401. AUTH-11A records the initial token that was within clock-skew tolerance; AUTH-11B records the corrected test. |
| AUTH-12 | Alter a signed session token and call `/api/students`. | Tampered token returns HTTP 401. |
| AUTH-13 | Sign out, then repeat session/API/page requests. | Session is cleared, protected API returns 401, and protected page redirects to `/login`. |
| AUTH-14 | Verify rotated credential works and old generated credential is rejected. | New password is accepted; old password is rejected neutrally. |
| AUTH-15 | Check password-change/reset/recovery behavior where implemented. | No in-app workflow exists; report NOT EXECUTED / not implemented. |

Password reset/recovery is not part of Phase 1 execution because no such flow is present in the inspected login UI/auth configuration. Do not infer lockout or rate-limiting behavior; those controls were not established by this inspection.

## Scope note

Reset verification is documented in [QA-RESET-REPORT.md](./QA-RESET-REPORT.md). Phases 2 and 3 outcomes, defects, retests, cleanup, and validation are documented in [QA-PHASE2-ACADEMIC-REPORT.md](./QA-PHASE2-ACADEMIC-REPORT.md) and [QA-PHASE3-STUDENT-REPORT.md](./QA-PHASE3-STUDENT-REPORT.md). Finalized academic decisions and cross-school follow-up are in [SCHOOL-ACADEMIC-FOLLOW-UP-BACKLOG.md](./SCHOOL-ACADEMIC-FOLLOW-UP-BACKLOG.md). The prior billing run remains documented in [BILLING-QA-REPORT.md](./tests/billing/BILLING-QA-REPORT.md), but its pass counts are pre-reset evidence and require regression retest.
