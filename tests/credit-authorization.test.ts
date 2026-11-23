import assert from "node:assert/strict";
import { test } from "node:test";
import { canManageStudentCredits } from "../src/lib/finance/credit-access";

test("only ADMIN sessions can manage student credits", () => {
  assert.equal(canManageStudentCredits("ADMIN"), true);
  assert.equal(canManageStudentCredits("BOARD_MEMBER"), false);
  assert.equal(canManageStudentCredits(""), false);
  assert.equal(canManageStudentCredits(null), false);
  assert.equal(canManageStudentCredits(undefined), false);
});
