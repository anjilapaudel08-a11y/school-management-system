# Phase 1 Authentication and Authorization Report

**Date:** 2026-11-23
**Environment:** Local Next.js development server at `http://127.0.0.1:3000`, connected only to the verified isolated QA database `ep-green-glade-ayptuugl-pooler.c-5.us-east-2.aws.neon.tech/neondb`.
**Scope:** Authentication and authorization only. No Phase 2 tests were started.

## Safety and pre-test verification

- Read-only fixture verification confirmed the primary QA school has 2 academic years, 12 classes, 4 sections, 52 students, 8 teachers, 5 subjects, 92 enrollments, 60 exams, 300 exam subjects, 1,239 marks, 116 fee structures, 12 discounts, 14 student charges, and 2 credits.
- Relationship checks found zero mismatches across school/year/class/section enrollments, class-subject mappings, teacher assignments, exam/term/class relations, exam-subject mappings, marks/enrollments, fee class/year relations, and student finance records.
- Every ID in the refreshed billing fixture mapping resolved to the expected record and school/year/class/student relationship.
- The QA Accountant was exactly one `ADMIN` user. Its password was rotated to a new random value using a bcrypt cost-12 hash and the persisted hash was verified. The password is not included in this report.
- No reset, truncate, reseed, schema change, migration, bill, payment, credit application, or other financial write occurred during Phase 1. Final database checks found 2 credits, 0 credit applications, 0 bills, 0 payments, 1 user, and 16 applied migrations.

## Test results

### AUTH-01 — Valid QA Accountant sign-in

- **Preconditions and test data:** No authenticated browser session; one `qa.accountant@example.test` user with `ADMIN` role; freshly rotated QA password.
- **Exact steps:** Open `/login`; enter the QA Accountant email and new password; select **Sign in**.
- **Expected:** Credentials are accepted, a session is established, and the dashboard opens.
- **Actual:** The browser navigated to `/dashboard`; the page displayed the QA school and Accountant identity.
- **Status:** **PASS**
- **Evidence:** Browser URL and dashboard snapshot; `/api/auth/session` returned the expected email, `ADMIN` role, and user ID.
- **Defects/severity:** None.

### AUTH-02 — Incorrect password

- **Preconditions and test data:** Signed-out browser; valid QA Accountant email; deliberately incorrect test password.
- **Exact steps:** Submit the valid email with the incorrect password.
- **Expected:** Sign-in is rejected with a neutral error and no authenticated session.
- **Actual:** The browser remained on `/login` and displayed `Invalid email or password.`.
- **Status:** **PASS**
- **Evidence:** Browser error text and unchanged login URL; Auth.js logged the expected `CredentialsSignin`.
- **Defects/severity:** None.

### AUTH-03 — Unknown email

- **Preconditions and test data:** Signed-out browser; `nobody.qa@example.test` and a deliberately incorrect password.
- **Exact steps:** Submit the unknown email through the login form.
- **Expected:** The same neutral rejection as AUTH-02; no session.
- **Actual:** The browser displayed `Invalid email or password.` and stayed on `/login`.
- **Status:** **PASS**
- **Evidence:** Browser result matched AUTH-02. The response did not reveal whether the account existed.
- **Defects/severity:** None.

### AUTH-04 — Missing credentials and required-field validation

- **Preconditions and test data:** Signed-out browser; blank login form.
- **Exact steps:** Select **Sign in** with both fields empty; then request `/api/auth/csrf` and POST an empty credentials payload to `/api/auth/callback/credentials` with the returned CSRF token.
- **Expected:** Browser-required fields block the empty form; the server callback rejects missing credentials and does not issue a session.
- **Actual:** The browser focused the required email field and remained on `/login`. The callback returned an Auth.js `CredentialsSignin` redirect result; `/api/auth/session` remained null.
- **Status:** **PASS**
- **Evidence:** Both inputs have the `required` attribute; CSRF endpoint returned 200; callback returned the sign-in error URL; session response was null.
- **Defects/severity:** None.

### AUTH-05 — Protected pages, signed out and signed in

- **Preconditions and test data:** First a browser with no session, then the authenticated QA ADMIN session.
- **Exact steps:** While signed out, open `/dashboard` and `/dashboard/results`; after AUTH-01, open `/dashboard` and `/dashboard/results` again.
- **Expected:** Signed-out requests redirect to `/login`; the authenticated ADMIN can open the pages.
- **Actual:** Both anonymous dashboard paths redirected with HTTP 307 to `/login`. With the ADMIN session, `/dashboard` and `/dashboard/results` rendered successfully.
- **Status:** **PASS**
- **Evidence:** Browser navigation URLs; authenticated Results page rendered its heading and controls.
- **Defects/severity:** None.

### AUTH-06 — Session contents and persistence

- **Preconditions and test data:** Authenticated QA ADMIN session.
- **Exact steps:** Read `/api/auth/session`; reload `/dashboard`; read the session again.
- **Expected:** Session persists and includes the expected identity and role, but never the password or hash.
- **Actual:** Before and after reload, the session contained the QA email, user ID, and `ADMIN` role. It had no `password` property.
- **Status:** **PASS**
- **Evidence:** Browser `/api/auth/session` responses and successful reload to `/dashboard`.
- **Defects/severity:** None.

### AUTH-07 — Anonymous API requests

- **Preconditions and test data:** Browser without a session.
- **Exact steps:** GET `/api/students` and `/api/bills`; POST an empty request to `/api/student-credits` without cookies.
- **Expected:** Each protected request returns 401 and does not mutate data.
- **Actual:** All requests returned HTTP 401 with `{"error":"You must be signed in."}`. Final database counts remained unchanged.
- **Status:** **PASS**
- **Evidence:** Browser fetch results; final database counts remained 2 credits, 0 credit applications, 0 bills, and 0 payments.
- **Defects/severity:** None.

### AUTH-08 — ADMIN API access

- **Preconditions and test data:** Authenticated QA ADMIN session; seeded fixture.
- **Exact steps:** GET `/api/students` and `/api/student-credits` with the browser session.
- **Expected:** Authorized reads succeed and return only the seeded fixture records.
- **Actual:** `/api/students` returned HTTP 200 with 52 students; `/api/student-credits` returned HTTP 200 with 2 credits.
- **Status:** **PASS**
- **Evidence:** Browser fetch response codes and result counts.
- **Defects/severity:** None.

### AUTH-09 — Non-ADMIN credit API restrictions

- **Preconditions and test data:** Synthetic signed `BOARD_MEMBER` session token for the local QA app; no database user was created.
- **Exact steps:** Send GET and POST requests to `/api/student-credits` with the non-ADMIN session.
- **Expected:** Both requests return 403 before reading or changing credit data.
- **Actual:** Both returned HTTP 403 with `Only the Accountant can manage student credits.`. Credit, application, bill, payment, and user counts remained unchanged.
- **Status:** **PASS**
- **Evidence:** Direct HTTP responses and post-test read-only database counts.
- **Defects/severity:** None for API data/write protection.

### AUTH-10 — Non-ADMIN direct access to credit page (initial run)

- **Preconditions and test data:** Same synthetic signed `BOARD_MEMBER` session token.
- **Exact steps:** GET `/dashboard/finance/credits` directly, bypassing the hidden navigation link.
- **Expected:** Non-ADMIN should not be able to open the ADMIN-only credit-management page.
- **Actual:** The page returned HTTP 200 and included the Student Credits interface, although its APIs returned 403.
- **Status:** **FAIL — confirmed defect, fixed and retested as AUTH-10R**
- **Evidence:** Initial page response was 200 and contained the page UI; GET/POST APIs independently returned 403.
- **Defect/severity:** **Low (P3), authorization/UI consistency.** The page itself was reachable, but credit data and mutations remained protected by the API.

### AUTH-10R — Non-ADMIN direct page access (retest after fix)

- **Preconditions and test data:** Same non-ADMIN session token after the page guard change.
- **Exact steps:** Repeat GET `/dashboard/finance/credits`; also open the page as the QA ADMIN.
- **Expected:** Non-ADMIN is redirected away; ADMIN can still access the page.
- **Actual:** Non-ADMIN received HTTP 307 to `/dashboard`; ADMIN still received the credit page and saw 2 ledger records.
- **Status:** **PASS**
- **Evidence:** Direct HTTP redirect/location; authenticated browser rendered the ADMIN page.
- **Defect resolution:** Added a shared credit-role predicate and server-side role guard for the credit page. The API guard remains in place.

### AUTH-11A — Expired-session test fixture calibration

- **Preconditions and test data:** A signed test token was created with a one-second lifetime; request was sent 1.5 seconds later.
- **Exact steps:** Send the token to `/api/students`.
- **Expected:** 401 for a token outside the accepted expiry window.
- **Actual:** The API returned 200 because this token was still inside Auth.js's clock-skew tolerance; it was not a valid test of an expired session.
- **Status:** **FAIL — test fixture was insufficiently expired; corrected and rerun as AUTH-11B**
- **Evidence:** Initial HTTP 200 response; no application change was made for this result.
- **Defect/severity:** None. This was a test-harness timing issue, not an application defect.

### AUTH-11B — Explicitly expired session

- **Preconditions and test data:** Signed token generated with an expiration 60 seconds in the past.
- **Exact steps:** Send the token to `/api/students`.
- **Expected:** 401 with the signed-out response.
- **Actual:** HTTP 401 with `{"error":"You must be signed in."}`.
- **Status:** **PASS**
- **Evidence:** Direct HTTP response and expected Auth.js invalid-session log.
- **Defects/severity:** None.

### AUTH-12 — Tampered session token

- **Preconditions and test data:** Signed non-ADMIN token, altered after signing.
- **Exact steps:** Change the final token character and send it to `/api/students`.
- **Expected:** Invalid token is rejected with 401.
- **Actual:** HTTP 401 with `{"error":"You must be signed in."}`.
- **Status:** **PASS**
- **Evidence:** Direct HTTP response; Auth.js logged the expected invalid JWT/session error.
- **Defects/severity:** None.

### AUTH-13 — Logout and post-logout access

- **Preconditions and test data:** Authenticated QA ADMIN session.
- **Exact steps:** Open the dashboard navigation and invoke its **Sign out** handler; read `/api/auth/session`; request `/api/students`; navigate to `/dashboard/finance/credits`.
- **Expected:** Logout clears the session, protected API returns 401, and protected page redirects to `/login`.
- **Actual:** Browser navigated to `/login`; session response was null; `/api/students` returned 401; the credit page redirected to `/login`.
- **Status:** **PASS**
- **Evidence:** Browser URL and API/session responses.
- **Harness note:** The Next.js development overlay intercepted pointer clicks. The browser automation invoked the actual button click handler programmatically; no application code was bypassed.
- **Defects/severity:** None.

### AUTH-14 — Password rotation and old credential rejection

- **Preconditions and test data:** Existing QA ADMIN account; no in-app password-management workflow exists.
- **Exact steps:** Rotate only the account password in the verified QA database to a new random value; hash with bcrypt cost 12; verify the persisted hash; sign in using the new credential; after logout, try the old generated credential; sign in again using the new credential.
- **Expected:** New credential signs in; previous credential is rejected; no plaintext is stored or returned in the session.
- **Actual:** Persisted bcrypt comparison succeeded; new credential signed in; previous credential received the neutral invalid-credentials message; the new credential signed in again.
- **Status:** **PASS**
- **Evidence:** Read-only target/role check, bcrypt comparison, browser login results, and session response without a password property.
- **Defects/severity:** No application password-change workflow exists; credential rotation was an explicitly authorized QA account update, not an in-app feature test. The one-time password is delivered separately and omitted here.

### AUTH-15 — Password change, reset, and recovery workflow

- **Preconditions and test data:** Source inspection of `src/app` and the login/auth configuration.
- **Exact steps:** Search application routes and UI for in-app password-change, forgot-password, reset, or recovery flows.
- **Expected:** Exercise any implemented flow; if none exists, report it as unavailable instead of assuming behavior.
- **Actual:** No such UI or route was found. The only password-related application path is credential sign-in.
- **Status:** **NOT EXECUTED — workflow not implemented**
- **Evidence:** Search found password handling only in `src/auth.ts` and `src/app/login/page.tsx`.
- **Defects/severity:** Not treated as a Phase 1 defect because no such workflow is implemented; password recovery remains a product gap if required.

## Harness issues and reruns

- A browser probe combined reload and session evaluation; navigation destroyed the execution context. The steps were separated and the reload/session test passed.
- A second probe consumed the same response JSON body twice; it was corrected to read the body once, and the authenticated API checks passed.
- A one-second JWT test was accepted within clock-skew tolerance; a token expired by 60 seconds was then tested and correctly rejected.
- The Next.js development overlay intercepted physical pointer clicks on **Sign out**. Invoking the actual button handler through the browser automation completed logout and verified the cleared session.
- Intentional invalid-credential and invalid-token tests generated expected Auth.js error logs; they did not indicate application failures.

## Code changes and validation

- Added a shared student-credit role predicate and server-side ADMIN check for the credit page. The API-level ADMIN check remains unchanged in behavior.
- Added `tests/credit-authorization.test.ts`.
- `npx eslint` on the changed auth files and focused test passed; `npx tsc --noEmit` passed; `npx tsx --test tests/credit-authorization.test.ts` passed **1/1**.
- No financial calculation, database structure, migration, billing suite, or Phase 2 workflow was changed or tested.

## Remaining blockers before Phase 2

1. Password change/reset/recovery is not implemented. The QA password was changed out of band; no product workflow could be tested.
2. The broader billing and finance regression suites remain pre-reset evidence and have not been rerun. They are outside Phase 1 and must not be interpreted as Phase 1 failures.
3. Full-suite lint/build and non-authentication test campaigns were not run; only focused checks for the authorization change were run.

No unresolved Phase 1 authentication or authorization defect remains after the AUTH-10R retest. Phase 2 has not started.
