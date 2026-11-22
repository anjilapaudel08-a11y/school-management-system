# Billing QA Report

Test target: ep-green-glade-ayptuugl-pooler.c-5.us-east-2.aws.neon.tech/neondb
Fixture: BILL_QA_2083 (isolated school; existing school data was not used)

## Overall results

| Metric | Result |
|---|---:|
| Total scenarios | 70 |
| Passed | 47 |
| Failed | 0 |
| Blocked | 10 |
| Not executed | 13 |
| Critical defects | 0 |
| High-priority defects | 0 |

## Execution note

The broad suite is supplemented by focused live-database retests of quantity-based charges, concurrent bill numbering, idempotent payment retries, and student deletion with billing history.

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
| A08 | Student charge isolation | S001 has no S003 charges | {"studentId":"cmwrjlqu200089kw44opqo1f5","studentChargeItems":0} | PASS |
| A09 | Grade-specific fees | Rs. 24,600 | {"total":24600,"feeTypes":["TUITION","ADMISSION","COMPUTER_LAB","EXAM"]} | PASS |
| SC01 | Student-charge frequency amounts | All student-charge frequencies use rate multiplied by their calculated quantity | {"chargeItems":[{"studentId":"cmwrjlrzp000c9kw4kcgxhdoh","description":"BUS Monthly","quantity":3,"amount":4500},{"studentId":"cmwrjlrzp000c9kw4kcgxhdoh","description":"Student Misc One-Time","quantity":1,"amount":700},{"studentId":"cmwrjlsp9000e9kw47nqr5g6w","description":"BUS Monthly","quantity":3,"amount":3000},{"studentId":"cmwrjlsp9000e9kw47nqr5g6w","description":"BUS Term Quantity Two","quantity":2,"amount":800},{"studentId":"cmwrjltev000g9kw43b72brv6","description":"BUS Monthly","quantity":3,"amount":3600},{"studentId":"cmwrjltev000g9kw43b72brv6","description":"BUS Annual Quantity Three","quantity":3,"amount":600}]} | PASS |
| SC02 | Unpaid first bill does not repeat charges | Unpaid first bill retains its charges; later bill adds neither duplicate charges nor old balances | {"firstBill":{"status":"UNPAID","total":26700,"studentChargeItems":2},"secondBill":{"total":17300,"studentChargeItems":0},"statement":{"originalBillDue":26700,"subsequentBillDue":17300,"totalDue":44000}} | PASS |
| SC03 | Partial first bill does not repeat charges | Partial settlement stays on the original bill; later bill has no duplicate charge or balance | {"firstBill":{"status":"PARTIAL","outstanding":26600},"secondBill":{"total":17300,"studentChargeItems":0},"statement":{"originalBillDue":26600,"subsequentBillDue":17300,"totalDue":43900}} | PASS |
| SC04 | Charge remains eligible until active dates | A charge outside one period remains available to the next eligible period | {"earlyBillChargeItems":0,"eligibleBillCharge":{"quantity":1,"amount":1200}} | PASS |
| SC05 | Unpaid cancelled bill releases its charge | Cancelled bill remains for audit and charge appears once on its replacement | {"cancelledBill":{"status":"CANCELLED","studentChargeItems":2},"replacementBill":{"status":"UNPAID","studentChargeItems":2},"activeApplications":2,"releasedApplications":2,"statement":{"cancelledBillDue":0,"replacementBillDue":26700,"totalDue":26700}} | PASS |
| SC06 | Settled bill cannot release its charge | Cancellation requires reversal or credit handling before rebilling | {"cancellationStatus":409,"originalStatus":"PARTIAL","activeApplications":2,"nextBillStudentChargeItems":0} | PASS |
| SC07 | Concurrent bills apply each charge once | Concurrent non-overlapping bills create one application per student charge | {"billStatuses":[201,201],"chargeItemsAcrossBills":2,"activeApplications":2} | PASS |
| B01 | Consecutive non-overlapping periods | Both bills succeed | {"bills":["BILL-000002","BILL-000003"],"secondTotal":17300} | PASS |
| B02 | Partial billing overlap | Second bill rejected with 409 | {"secondStatus":409,"error":"This billing period overlaps with an existing bill for this student."} | PASS |
| B03 | Contained billing overlap | Second bill rejected with 409 | {"secondStatus":409,"error":"This billing period overlaps with an existing bill for this student."} | PASS |
| B04 | Exact duplicate period | Second bill rejected with 409 | {"secondStatus":409} | PASS |
| B08 | Invalid bill inputs | All invalid requests rejected | {"rejectedStatuses":[400,400,400,400,404,400]} | PASS |
| B09 | Concurrent identical bill requests | Exactly one bill is created | {"statuses":[201,409],"persistedBills":1} | PASS |
| D01 | Annual class fee billed once | Admission fee appears only in the first eligible bill | [{"period":"P1","admissionCount":1},{"period":"P2","admissionCount":0},{"period":"P3","admissionCount":0},{"period":"P4","admissionCount":0}] | PASS |
| D02 | Term fee schedule | One exam fee in each configured term | [{"period":"P1","examCount":1},{"period":"P2","examCount":1},{"period":"P3","examCount":1},{"period":"P4","examCount":1}] | PASS |
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
| I03 | Concurrent unique bill numbers | All concurrently created bill numbers are unique | {"statuses":[201,201],"billNumbers":["BILL-000002","BILL-000003"]} | PASS |
| I05 | Financial history after student deletion | Historical bills must not be silently deleted | {"deleteStatus":409,"billRetained":true} | PASS |
| I06 | Database relationship integrity | All bill items and payments reference valid parents | {"billItems":5,"payments":1,"billNumber":"BILL-000002"} | PASS |
| B06 | Bills in different academic years | Scenario executed and independently verified | "The QA fixture contains one year; this scenario was not executed." | NOT EXECUTED |
| C01 | Discount starts before period | Scenario executed and independently verified | "Date-overlap discount scenarios not yet implemented in the runner." | NOT EXECUTED |
| C02 | Discount ends at period end | Scenario executed and independently verified | "Date-overlap discount scenarios not yet implemented in the runner." | NOT EXECUTED |
| C03 | Discount starts after period | Scenario executed and independently verified | "Date-overlap discount scenarios not yet implemented in the runner." | NOT EXECUTED |
| C04 | Expired discount | Scenario executed and independently verified | "Date-overlap discount scenarios not yet implemented in the runner." | NOT EXECUTED |
| C05 | Partial-period discount | Scenario executed and independently verified | "Date-overlap discount scenarios not yet implemented in the runner." | NOT EXECUTED |
| C06 | Overlapping discounts | Scenario executed and independently verified | "API rejects overlap; deterministic resolution and bill-item discount provenance are absent." | NOT EXECUTED |
| C07 | Discount change after bill | Scenario executed and independently verified | "Historical snapshot mutation scenario not yet implemented." | NOT EXECUTED |
| E01 | Previous unpaid bill carry-forward | Scenario executed and independently verified | "No previous-dues carry-forward behavior exists in bill generation." | BLOCKED |
| E02 | Previous partial bill settlement | Scenario executed and independently verified | "Credit application API absent; carry-forward rule is unspecified." | BLOCKED |
| E03 | Multiple prior payments | Scenario executed and independently verified | "Prior-dues carry-forward is absent." | BLOCKED |
| E04 | Fully settled old bill | Scenario executed and independently verified | "Prior-dues carry-forward is absent." | BLOCKED |
| E05 | Excess credit application rejected | Scenario executed and independently verified | "No credit application API exists." | BLOCKED |
| E06 | Partial credit application | Scenario executed and independently verified | "No credit application API exists." | BLOCKED |
| E07 | Duplicate credit application | Scenario executed and independently verified | "No credit application API exists." | BLOCKED |
| F11-concurrent-waiver | Concurrent payment and waiver operations | Scenario executed and independently verified | "Not separately executed; F11 covers concurrent cash payments only." | NOT EXECUTED |
| G01 | Decimal fee rounding | Scenario executed and independently verified | "Precision scenarios not yet implemented." | NOT EXECUTED |
| G02 | Small fee amounts | Scenario executed and independently verified | "Precision scenarios not yet implemented; discount API excludes MISCELLANEOUS." | NOT EXECUTED |
| G03 | Large fee amounts | Scenario executed and independently verified | "Precision scenarios not yet implemented." | NOT EXECUTED |
| G04 | Zero-value bill | Scenario executed and independently verified | "Zero-value scenario not yet implemented." | NOT EXECUTED |
| I01 | Bill transaction rollback | Scenario executed and independently verified | "No test failpoint exists for injecting a mid-transaction failure." | BLOCKED |
| I02 | Payment transaction rollback | Scenario executed and independently verified | "No test failpoint exists for injecting a mid-transaction failure." | BLOCKED |
| master | Master end-to-end scenario | Scenario executed and independently verified | "Previous dues and credit application endpoints are unavailable." | BLOCKED |

## Defect report

No failures among executed scenarios.

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

This report does not certify the billing module as fully tested; blocked and unexecuted scenarios remain.
