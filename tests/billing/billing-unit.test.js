import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateLine,
  calculateOutstanding,
  statusForOutstanding,
} from "./helpers/expected-calculations.js";

test("line calculation rounds fractional discounts to currency cents", () => {
  assert.deepEqual(
    calculateLine({ quantity: 3, rate: 0.05, discountPercent: 50 }),
    { amount: 0.15, discountAmount: 0.08, netAmount: 0.07 },
  );
  assert.deepEqual(
    calculateLine({ quantity: 3, rate: 0.01, discountPercent: 50 }),
    { amount: 0.03, discountAmount: 0.02, netAmount: 0.01 },
  );
});

test("line calculation preserves cents for large amounts", () => {
  assert.deepEqual(
    calculateLine({
      quantity: 3,
      rate: 9999999999.99,
      discountPercent: 10,
    }),
    {
      amount: 29999999999.97,
      discountAmount: 3000000000,
      netAmount: 26999999999.97,
    },
  );
});

test("outstanding balances subtract payments, waivers, and credits in cents", () => {
  assert.equal(
    calculateOutstanding({
      totalAmount: 100.01,
      payments: [{ amount: 0.01 }, { amount: 0.02 }],
      waivers: [{ amount: 10 }],
      credits: [{ amount: 5.005 }],
    }),
    84.97,
  );
});

test("zero-value bills are not treated as settled bills", () => {
  assert.equal(statusForOutstanding(0, 0), "BLOCKED_ZERO_VALUE");
  assert.equal(statusForOutstanding(1, 0), "PAID");
  assert.equal(statusForOutstanding(1, 0.01), "PARTIAL");
});
