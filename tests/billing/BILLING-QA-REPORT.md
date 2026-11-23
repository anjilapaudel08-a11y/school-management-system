# Billing QA Report

Test target: ep-green-glade-ayptuugl-pooler.c-5.us-east-2.aws.neon.tech/neondb
Fixture: BILL_QA_2083 (isolated school; existing school data was not used)

## Overall results

The most recent completed full billing-suite run was **before** the student-credit implementation:

| Metric | Result |
|---|---:|
| Total scenarios | 75 |
| Passed | 71 |
| Failed | 0 |
| Blocked | 4 |
| Not executed | 0 |
| Critical defects | 0 |
| High-priority defects | 0 |

## Student-credit implementation follow-up (2026-11-23)

- Added Accountant-only manual credit issuance, same-year partial application, idempotency, reversal audit, and transaction-safe balance updates.
- Applied migration `20261123100000_add_student_credit_workflows` to the verified isolated QA database after explicit approval. It is additive; existing payment, bill, credit, salary, and other QA records were not modified.
- Existing credits with incomplete audit metadata remain visible but unavailable for application; no issuer, reason, date, or approval detail is fabricated.
- Updated settlement readers to exclude reversed applications while retaining their history. Payment records and their actual paid amounts are not modified by credit operations.
- Static verification: 7 credit rule/authorization tests and 4 billing unit tests pass; TypeScript, lint, Prisma schema validation, and the Webpack production build pass.
- The gated credit integration suite passed against the verified QA target. It covered issuance/retry, partial application, caps, same-year restrictions, concurrency, payment immutability, injected rollback, reversal, and legacy-credit ineligibility. Its temporary rows were removed.
- Accountant browser verification passed: issued a Rs. 250.50 credit, applied Rs. 200.00 to a temporary Rs. 1,000 bill, verified Rs. 50.50 remained, reversed the application, and confirmed the full Rs. 1,000 bill balance and retained reversal audit. The legacy unaudited credit remained disabled. The temporary credit, bill, and Accountant account were removed; a targeted database check found no test-created residue.
- The complete stress billing suite has not been rerun since credit implementation; the pre-credit full run remains 71 PASS, 0 FAIL, 4 BLOCKED. The credit-specific integration suite and browser flow are separate verification.
- Reproduce the gated integration run only against a verified QA target with the explicit environment confirmations `BILLING_TEST_CONFIRMATION=BILLING_QA_ONLY` and `CREDIT_QA_CONFIRMATION=STUDENT_CREDIT_QA_ONLY`, using `npx tsx --test tests/billing/student-credit.integration.test.js`. The test deletes only temporary IDs it creates.

## Execution note

The pre-implementation run's counts include focused retests of every initial failure. That run had a transient database disconnect in D02 and test-harness failures in I02, I07, I08, and `master`. D02 passed on retry. The rollback injector was fixed to restore Prisma's bound `$transaction` method; I02, I07, I08, and `master` then passed focused retries. I08's direct service call now catches only the expected injected failure and allows a longer test-only transaction wait. These were test-harness/environment issues, not application billing defects.

The run emitted a `pg` overlapping-query deprecation warning. Expected rejected-payment cases also logged server-side error stacks while returning the expected validation responses; their scenarios passed.

## Accountant browser retest before student-credit migration (2026-11-22 to 2026-11-23)

At the time of this earlier browser retest, the fictional QA dataset was preserved; no reset, truncate, reseed, or migration was run. The later student-credit migration and verification are recorded above.

- Fee structure creation and editing succeeded. A duplicate submission showed the expected HTTP 409 validation error; temporary fee rows were removed.
- A student charge was created and edited; its test record was deleted and its absence verified. A shared bulk BUS charge was submitted for one student (`1 charges saved`), appeared in the student-charge workflow, and was removed afterward.
- An individual discount was edited from 12.5% to 15%; a one-student bulk discount also succeeded. Both temporary discounts were removed; the two pre-existing fictional discounts remain.
- The Accountant generated bill `BILL-000005` for Aarav, recorded partial payments, a waiver, and a final payment, and verified the zero balance, payment history, and student-profile financial summary. An unpaid Sita bill was cancelled and regenerated as `BILL-000009`; a partial payment was recorded on the replacement.
- Salary records and partial/full salary payments were submitted through the UI. The teacher selector no longer includes a teacher from another school. The bill and salary date pickers now use BS values. One salary payment recorded before that picker fix has a wrong historical date; it was not altered, and requires an authorized reversal/correction decision.
- Expense create/edit succeeded after fixing the form to submit its BS date unchanged; the temporary expense was removed. UI overpayment validation prevented submission. The bulk adjustment and billing forms displayed their successful/error outcomes.

These are browser workflow checks against the fictional QA school, not production tests.

## Individual scenario report

| Test ID | Scenario | Expected | Actual | Result |
|---|---|---|---|---|
| A01 | Normal quarterly bill | Rs. 21,500; UNPAID | {"total":21500,"status":"UNPAID","itemCount":5} | PASS |
| A02 | Multiple separate discounts | Rs. 19,500 | {"total":19500,"discount":2000} | PASS |
| A03 | One discount over multiple fee types | Rs. 18,680 | {"total":18680,"discount":2820} | PASS |
| A04 | Full tuition scholarship | Rs. 8,500 including the undiscounted term charge | {"total":8500,"scholarshipTuitionNet":0,"studentTermCharge":[2000]} | PASS |
| A05 | Student-specific BUS and MISC charges | Rs. 26,700 | {"total":26700} | PASS |
| A06 | Discounts exclude student-specific charges | Rs. 24,900 | {"total":24900,"discount":1800} | PASS |
| A07 | Quantity-based BUS charge | Rs. 26,300 | {"total":26300,"bus":[{"quantity":6,"rate":800,"amount":4800}]} | PASS |
| A08 | Student charge isolation | S001 has no S003 charges | {"studentId":"cmws50vb8000duww4ulx51qud","studentChargeItems":0} | PASS |
| A09 | Grade-specific fees | Rs. 24,600 | {"total":24600,"feeTypes":["TUITION","ADMISSION","COMPUTER_LAB","EXAM"]} | PASS |
| SC01 | Student-charge frequency amounts | All student-charge frequencies use rate multiplied by their calculated quantity | {"chargeItems":[{"studentId":"cmws50wtz000juww4yv2q3ai3","description":"BUS Monthly","quantity":3,"amount":4500},{"studentId":"cmws50wtz000juww4yv2q3ai3","description":"Student Misc One-Time","quantity":1,"amount":700},{"studentId":"cmws50xj8000muww4nfllu6xd","description":"BUS Monthly","quantity":3,"amount":3000},{"studentId":"cmws50xj8000muww4nfllu6xd","description":"BUS Term Quantity Two","quantity":2,"amount":800},{"studentId":"cmws50yh1000puww4crzi3mc1","description":"BUS Annual Quantity Three","quantity":3,"amount":600},{"studentId":"cmws50yh1000puww4crzi3mc1","description":"BUS Monthly","quantity":3,"amount":3600}]} | PASS |
| SC02 | Unpaid first bill does not repeat charges | Unpaid first bill retains its charges; later bill adds neither duplicate charges nor old balances | {"firstBill":{"status":"UNPAID","total":26700,"studentChargeItems":2},"secondBill":{"total":17300,"studentChargeItems":0},"statement":{"originalBillDue":26700,"subsequentBillDue":17300,"totalDue":44000}} | PASS |
| SC03 | Partial first bill does not repeat charges | Partial settlement stays on the original bill; later bill has no duplicate charge or balance | {"firstBill":{"status":"PARTIAL","outstanding":26600},"secondBill":{"total":17300,"studentChargeItems":0},"statement":{"originalBillDue":26600,"subsequentBillDue":17300,"totalDue":43900}} | PASS |
| SC04 | Charge remains eligible until active dates | A charge outside one period remains available to the next eligible period | {"earlyBillChargeItems":0,"eligibleBillCharge":{"quantity":1,"amount":1200}} | PASS |
| SC05 | Unpaid cancelled bill releases its charge | Cancelled bill remains for audit and charge appears once on its replacement | {"cancelledBill":{"status":"CANCELLED","studentChargeItems":2},"replacementBill":{"status":"UNPAID","studentChargeItems":2},"activeApplications":2,"releasedApplications":2,"statement":{"cancelledBillDue":0,"replacementBillDue":26700,"totalDue":26700}} | PASS |
| SC06 | Settled bill cannot release its charge | Cancellation requires reversal or credit handling before rebilling | {"cancellationStatus":409,"originalStatus":"PARTIAL","activeApplications":2,"nextBillStudentChargeItems":0} | PASS |
| SC07 | Concurrent bills apply each charge once | Concurrent non-overlapping bills create one application per student charge | {"billStatuses":[201,201],"chargeItemsAcrossBills":2,"activeApplications":2} | PASS |
| B01 | Consecutive non-overlapping periods | Both bills succeed | {"bills":["BILL-000010","BILL-000011"],"secondTotal":17300} | PASS |
| B02 | Partial billing overlap | Second bill rejected with 409 | {"secondStatus":409,"error":"This billing period overlaps with an existing bill for this student."} | PASS |
| B03 | Contained billing overlap | Second bill rejected with 409 | {"secondStatus":409,"error":"This billing period overlaps with an existing bill for this student."} | PASS |
| B04 | Exact duplicate period | Second bill rejected with 409 | {"secondStatus":409} | PASS |
| B08 | Invalid bill inputs | All invalid requests rejected | {"rejectedStatuses":[400,400,400,400,404,400]} | PASS |
| B09 | Concurrent identical bill requests | Exactly one bill is created | {"statuses":[201,409],"persistedBills":1} | PASS |
| D01 | Annual class fee billed once | Admission fee appears only in the first eligible bill | [{"period":"P1","admissionCount":1},{"period":"P2","admissionCount":0},{"period":"P3","admissionCount":0},{"period":"P4","admissionCount":0}] | PASS |
| D02 | Term fee schedule | One exam fee in each configured term | [{"period":"P1","examCount":1},{"period":"P2","examCount":1},{"period":"P3","examCount":1},{"period":"P4","examCount":1}] (focused retry after transient disconnect) | PASS |
| D03 | Class one-time fee | Class miscellaneous appears once in the academic year | [{"period":"P1","oneTimeCount":1},{"period":"P2","oneTimeCount":0},{"period":"P3","oneTimeCount":0},{"period":"P4","oneTimeCount":0}] | PASS |
| D04 | One-time student charge start date | Charge first appears in its first eligible period only | [{"period":"P1","count":0},{"period":"P2","count":0},{"period":"P3","count":1},{"period":"P4","count":0}] | PASS |
| D05 | Two-month inclusive billing period | Tuition Rs. 10,000; lab Rs. 1,000 | {"tuition":10000,"lab":1000,"total":19600} | PASS |
| F01 | Full payment | Bill becomes PAID | {"amount":21500,"status":"PAID"} | PASS |
| F02 | Multiple partial payments | Total actual payments Rs. 21,500 | {"payments":[5000,7000,4500,5000],"status":"PAID"} | PASS |
| F03 | Payment plus waiver | Rs. 8,500 outstanding and PARTIAL | {"outstanding":8500,"waiver":3000,"paidAmount":10000} | PASS |
| F04 | Multiple waivers and payments | Rs. 18,000 paid; Rs. 3,500 waived; PAID | {"paid":18000,"waived":3500,"status":"PAID"} | PASS |
| F05 | Waiver reason required | Null, empty, whitespace reasons rejected | {"statuses":[400,400,400]} | PASS |
| F06 | Excessive waiver rejected | Settlement over bill balance rejected | {"status":400,"error":"Payment plus waiver cannot exceed the outstanding balance of Rs. 21500.00."} | PASS |
| F07 | Payment plus waiver cannot over-settle | Rs. 22,000 settlement rejected | {"status":400,"error":"Payment plus waiver cannot exceed the outstanding balance of Rs. 21500.00."} | PASS |
| F08 | Payment on paid bill rejected | Further payment rejected | {"status":400,"error":"This bill has no outstanding balance."} | PASS |
| F09 | Payment on cancelled bill rejected | Payment rejected | {"status":400,"error":"Payment cannot be recorded against a cancelled bill.","cancellationSetup":"Direct QA status update; no cancellation API exists."} | PASS |
| F10 | Zero and negative payments rejected | Both requests rejected | {"statuses":[400,400]} | PASS |
| F11 | Concurrent payments exceeding balance | At most one Rs. 7,000 payment accepted on Rs. 10,000 bill | {"statuses":[201,400],"persistedPaymentSum":7000} | PASS |
| F12 | Duplicate payment request | Repeated identical request must not post twice | {"concurrentStatuses":[201,200],"reusedKeyStatus":409,"persistedDuplicates":1} | PASS |
| H01 | Fee change preserves old bill snapshot | Old line remains unchanged; next period uses new rate | {"oldAmount":15000,"newAmount":18000} | PASS |
| H02 | Deactivated class fee excluded from future bills | Historical item retained; future bill excludes it | {"oldBillHasLab":true,"newBillHasLab":false} | PASS |
| H03 | Student charge edits and deletion preserve historical bill items | Changing or deleting a source charge leaves its original bill-item snapshot unchanged | {"unchangedBillItemSnapshots":2,"activeApplications":2,"deletedChargeStatus":200} | PASS |
| H04 | Class change preserves historical fees | Old Grade 5 bill retained; next bill uses Grade 6 fees | {"oldRate":5000,"newRate":6000} | PASS |
| H05 | Missing enrollment rejected | Existing student without selected-year enrollment is rejected | {"status":400,"error":"Student is not enrolled in the selected academic year."} | PASS |
| I03 | Concurrent unique bill numbers | All concurrently created bill numbers are unique | {"statuses":[201,201],"billNumbers":["BILL-000010","BILL-000011"]} | PASS |
| I05 | Financial history after student deletion | Historical bills must not be silently deleted | {"deleteStatus":409,"billRetained":true} | PASS |
| I06 | Database relationship integrity | All bill items and payments reference valid parents | {"billItems":5,"payments":1,"billNumber":"BILL-000010"} | PASS |
| B06 | Multi-year billing, payment, and duplicate prevention | Previous-year balance remains on its original bill; new-year fees and discount calculate independently | {"previousYearDue":20500,"nextYearBill":26440,"nextYearDiscount":2160,"nextYearDue":25440,"duplicateStatus":409} | PASS |
| C01 | Discount begins before billing period | Pre-period start remains eligible for all three monthly fee months | {"tuitionDiscount":1500} | PASS |
| C02 | Discount ends at billing-period boundary | Inclusive end on the final billing day discounts all three monthly fee months | {"periodEnd":"2026-07-16T18:14:59.999Z","tuitionDiscount":1500} | PASS |
| C03 | Discount begins after billing period | No discount is applied before its start date | {"tuitionDiscount":0} | PASS |
| C04 | Expired discount | A discount ending before the billing period is excluded | {"tuitionDiscount":0} | PASS |
| C05 | Partial-period monthly discount | Only the one eligible month of three receives the 10% tuition discount | {"tuitionAmount":15000,"tuitionDiscount":500,"tuitionNet":14500} | PASS |
| C06 | Overlapping and adjacent discounts | Overlapping fee/date ranges return 409; a discount starting the following day is accepted | {"overlapStatus":409,"adjacentStatus":201,"savedDiscounts":2} | PASS |
| C07 | Discount edit preserves historical bill snapshot | Existing bill keeps its 10% discount; next bill uses the edited 20% discount | {"oldDiscount":1500,"newDiscount":3000} | PASS |
| E01 | Unpaid prior bill remains on original bill | New bill excludes prior unpaid balance; account statement retains both bill dues | {"previousBillDue":"21500","nextBillTotal":"17300","statementDue":38800} | PASS |
| E02 | Partial prior bill remains on original bill | Prior bill retains its Rs. 16,500 balance; new bill does not carry it forward | {"priorBillDue":16500,"nextBillTotal":"17300","statementDue":33800} | PASS |
| E03 | Multiple prior payments remain allocated to original bill | Three payments reduce only the original bill; the subsequent bill contains no prior balance | {"paymentCount":3,"paidAmount":4000,"nextBillTotal":"17300","statementDue":34800} | PASS |
| E04 | Fully settled prior bill is not carried forward | A paid prior bill has zero due; new bill contains only new-year charges | {"oldStatus":"PAID","oldDue":0,"nextBillTotal":"17300","statementDue":17300} | PASS |
| F11-concurrent-waiver | Concurrent payment and waiver cannot over-settle | Only one settlement succeeds; total payment plus waiver stays within the bill balance | {"statuses":[201,400],"paid":8000,"waived":7000,"remainingDue":6500} | PASS |
| G01 | Decimal amounts and fractional discount rounding | Rs. 0.15 fee rounds 50% discount to Rs. 0.08 and net to Rs. 0.07 | {"amount":0.15,"discount":0.08,"net":0.07,"billTotal":20000.07} | PASS |
| G02 | Smallest positive fee and rounding | Rs. 0.03 fee rounds a 50% discount to Rs. 0.02 and preserves a Rs. 0.01 balance | {"amount":0.03,"discount":0.02,"net":0.01} | PASS |
| G03 | Large amount precision | Large monthly fee, percentage discount, and bill total remain cent-accurate | {"tuitionAmount":29999999999.97,"tuitionDiscount":3000000000,"tuitionNet":26999999999.97,"billTotal":27000006499.97} | PASS |
| G04 | Zero, negative, and excessive amounts | Zero-value bills and negative fees/payments are rejected; overpayment leaves balances unchanged | {"zeroFeeStatus":201,"negativeFeeStatus":400,"zeroBillStatus":409,"negativePaymentStatus":400,"zeroPaymentStatus":400,"overpaymentStatus":400,"unchangedPaidAmount":0} | PASS |
| TEA01 | Teacher list school scoping | Teacher list contains only records from the configured school | {"teacherCount":5,"schoolScoped":true} | PASS |
| EXP01 | Expense form BS date contract | Expense creation and editing preserve the selected Bikram Sambat date | {"status":200,"amount":44.75,"expenseDateBS":{"year":2083,"month":8,"day":7}} | PASS |
| I01 | Bill generation transaction rollback | Failure after bill, bill items, and charge applications are written leaves none persisted | {"injected":true,"status":500,"persistedBills":0,"activeApplications":0} | PASS |
| I02 | Payment and balance-allocation rollback | Failure after payment creation and bill update leaves neither payment nor balance change | Focused retry passed; payment absent, paid amount 0, bill remains UNPAID | PASS |
| I07 | Waiver transaction rollback | Failure after waiver payment and bill update leaves neither the waiver nor status change | Focused retry passed; payment absent, paid amount 0, bill remains UNPAID | PASS |
| I08 | Salary payment transaction rollback | Failure after salary-payment creation and salary update leaves the payment absent and salary pending | Focused retry passed; no salary payment persisted and salary remains PENDING | PASS |
| master | Master bill, payment, waiver, and statement workflow | Successful bill settlement is reflected consistently in payments and account statements; previous due remains on its original bill | Focused retry passed; payment, waiver, original-bill due, next bill, and statement totals matched | PASS |
| E05 | Excess credit application rejected | Reject an application that exceeds available credit or bill due | Integration rejected over-credit and over-bill applications; no excess balance was applied | PASS |
| E06 | Partial credit application | Apply only the requested portion and retain the unused credit | Rs. 30.00 applied; a same-key retry replayed once; a separate Rs. 10.00 application left Rs. 10.00 credit and Rs. 60.00 bill due | PASS |
| E07 | Duplicate credit application | Prevent retrying an application twice while allowing separate partial applications | Same-key/same-payload retry replayed; changed payload with the same key returned 409; one application row remained | PASS |
| I09 | Credit application transaction rollback | Inject failures inside application and reversal and verify rollback | Injected failures left no application/balance update and left the unreversed application unchanged; successful reversal then restored balances | PASS |

## Defect report

No application billing defects were reproduced. The five initial failures were traced to one transient test-database disconnect and defects in the test-only transaction-failure injector/assertion; focused reruns passed after the test harness was corrected.

## Credit integration results

- **E05-E07 — excess, partial, duplicate, and same-year behavior:** passed in the gated QA integration test; same-year eligibility and idempotent retry behavior were verified.
- **I09 — credit-application/reversal rollback:** passed with controlled test-only failure injection; both the application and reversal transactions rolled back cleanly when injected failures occurred.

The credit scenarios previously blocked or not executed are now verified. The complete stress suite has not been rerun since the credit implementation, so its last full count remains the pre-credit result above. Do not infer prior-dues carry-forward from the earlier credit blockers: E01-E04 verified that unpaid and partially paid balances remain on their original bills and are not duplicated on subsequent bills.

## Inspection findings and scope limitations

- The production seed `prisma/seed.ts` deletes existing records and was not run.
- Test seed data uses a separately marked school and academic year in the explicitly authorized test branch.
- Student-specific charges are limited to BUS and MISCELLANEOUS and are not discounted by the billing route.
- StudentCharge has no active/deactivation flag. Bill cancellation is allowed only without payments or credits; it preserves the bill and releases charge applications for replacement.
- StudentChargeApplication retains billing history independently from the source charge; historical BillItem descriptions and amounts are snapshots.
- Previous dues are not carried forward by bill generation.
- Discount selection uses the first match without an explicit order, and BillItem does not store the selected discount identity.
- Payment creation requires an Idempotency-Key; identical retries replay the existing payment and changed payloads with the same key are rejected.
- Concurrent bill-number allocation now uses a transaction-scoped advisory lock; I03 verifies unique numbers.
- Student deletion is blocked when bills exist, with a database-level RESTRICT constraint as a second safeguard.

This report does not certify the billing module as ready: the complete stress suite must be rerun after credit implementation, and production configuration and production-like recovery testing are outside this QA run.
