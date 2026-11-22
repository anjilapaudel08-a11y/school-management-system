ALTER TABLE "Bill"
DROP CONSTRAINT "Bill_studentId_fkey";

ALTER TABLE "Bill"
ADD CONSTRAINT "Bill_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "idempotencyRequestHash" TEXT;

CREATE UNIQUE INDEX "Payment_idempotencyKey_key"
ON "Payment"("idempotencyKey");
