BEGIN;

ALTER TABLE "StudentCredit"
ADD COLUMN "issueDate" TIMESTAMP(3),
ADD COLUMN "reason" TEXT,
ADD COLUMN "issuedByUserId" TEXT,
ADD COLUMN "issuanceIdempotencyKey" TEXT,
ADD COLUMN "issuanceRequestHash" TEXT;

ALTER TABLE "BillCreditApplication"
ADD COLUMN "appliedByUserId" TEXT,
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyRequestHash" TEXT,
ADD COLUMN "reversedAt" TIMESTAMP(3),
ADD COLUMN "reversedByUserId" TEXT,
ADD COLUMN "reversalReason" TEXT;

CREATE UNIQUE INDEX "StudentCredit_issuanceIdempotencyKey_key"
ON "StudentCredit"("issuanceIdempotencyKey");

CREATE UNIQUE INDEX "BillCreditApplication_idempotencyKey_key"
ON "BillCreditApplication"("idempotencyKey");

CREATE INDEX "StudentCredit_issuedByUserId_idx"
ON "StudentCredit"("issuedByUserId");

CREATE INDEX "BillCreditApplication_billId_reversedAt_idx"
ON "BillCreditApplication"("billId", "reversedAt");

CREATE INDEX "BillCreditApplication_creditId_reversedAt_idx"
ON "BillCreditApplication"("creditId", "reversedAt");

CREATE INDEX "BillCreditApplication_appliedByUserId_idx"
ON "BillCreditApplication"("appliedByUserId");

CREATE INDEX "BillCreditApplication_reversedByUserId_idx"
ON "BillCreditApplication"("reversedByUserId");

ALTER TABLE "StudentCredit"
ADD CONSTRAINT "StudentCredit_issuedByUserId_fkey"
FOREIGN KEY ("issuedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillCreditApplication"
ADD CONSTRAINT "BillCreditApplication_appliedByUserId_fkey"
FOREIGN KEY ("appliedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillCreditApplication"
ADD CONSTRAINT "BillCreditApplication_reversedByUserId_fkey"
FOREIGN KEY ("reversedByUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentCredit"
ADD CONSTRAINT "StudentCredit_amount_positive_check"
CHECK ("amount" > 0) NOT VALID;

ALTER TABLE "StudentCredit"
ADD CONSTRAINT "StudentCredit_appliedAmount_range_check"
CHECK ("appliedAmount" >= 0 AND "appliedAmount" <= "amount") NOT VALID;

ALTER TABLE "BillCreditApplication"
ADD CONSTRAINT "BillCreditApplication_amount_positive_check"
CHECK ("amount" > 0) NOT VALID;

ALTER TABLE "StudentCredit"
ADD CONSTRAINT "StudentCredit_issuance_idempotency_pair_check"
CHECK (
  ("issuanceIdempotencyKey" IS NULL AND "issuanceRequestHash" IS NULL)
  OR
  ("issuanceIdempotencyKey" IS NOT NULL AND "issuanceRequestHash" IS NOT NULL)
) NOT VALID;

ALTER TABLE "StudentCredit"
ADD CONSTRAINT "StudentCredit_issue_audit_check"
CHECK (
  ("issueDate" IS NULL AND "reason" IS NULL AND "issuedByUserId" IS NULL)
  OR
  (
    "issueDate" IS NOT NULL
    AND "reason" IS NOT NULL
    AND length(trim("reason")) > 0
    AND "notes" IS NOT NULL
    AND length(trim("notes")) > 0
    AND "source" = 'MANUAL_ADJUSTMENT'
    AND "sourcePaymentId" IS NULL
    AND "issuedByUserId" IS NOT NULL
    AND "issuanceIdempotencyKey" IS NOT NULL
    AND "issuanceRequestHash" IS NOT NULL
  )
) NOT VALID;

ALTER TABLE "BillCreditApplication"
ADD CONSTRAINT "BillCreditApplication_idempotency_pair_check"
CHECK (
  ("idempotencyKey" IS NULL AND "idempotencyRequestHash" IS NULL)
  OR
  ("idempotencyKey" IS NOT NULL AND "idempotencyRequestHash" IS NOT NULL)
) NOT VALID;

ALTER TABLE "BillCreditApplication"
ADD CONSTRAINT "BillCreditApplication_application_audit_check"
CHECK (
  ("appliedByUserId" IS NULL AND "idempotencyKey" IS NULL AND "idempotencyRequestHash" IS NULL)
  OR
  ("appliedByUserId" IS NOT NULL AND "idempotencyKey" IS NOT NULL AND "idempotencyRequestHash" IS NOT NULL)
) NOT VALID;

ALTER TABLE "BillCreditApplication"
ADD CONSTRAINT "BillCreditApplication_reversal_audit_check"
CHECK (
  ("reversedAt" IS NULL AND "reversedByUserId" IS NULL AND "reversalReason" IS NULL)
  OR
  (
    "reversedAt" IS NOT NULL
    AND "reversedByUserId" IS NOT NULL
    AND "reversalReason" IS NOT NULL
    AND length(trim("reversalReason")) > 0
  )
) NOT VALID;

COMMIT;
