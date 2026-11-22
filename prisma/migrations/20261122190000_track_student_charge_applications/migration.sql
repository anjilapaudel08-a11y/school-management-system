CREATE TABLE "StudentChargeApplication" (
    "id" TEXT NOT NULL,
    "studentChargeId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "billItemId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentChargeApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentChargeApplication_billItemId_key"
ON "StudentChargeApplication"("billItemId");

CREATE INDEX "StudentChargeApplication_studentChargeId_idx"
ON "StudentChargeApplication"("studentChargeId");

CREATE INDEX "StudentChargeApplication_billId_idx"
ON "StudentChargeApplication"("billId");

ALTER TABLE "StudentChargeApplication"
ADD CONSTRAINT "StudentChargeApplication_billId_fkey"
FOREIGN KEY ("billId") REFERENCES "Bill"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentChargeApplication"
ADD CONSTRAINT "StudentChargeApplication_billItemId_fkey"
FOREIGN KEY ("billItemId") REFERENCES "BillItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

WITH ranked_applications AS (
    SELECT
        item."studentChargeId",
        item."billId",
        item."id" AS "billItemId",
        bill."status" <> 'CANCELLED'
            OR EXISTS (
                SELECT 1
                FROM "Payment" payment
                WHERE payment."billId" = bill."id"
            )
            OR EXISTS (
                SELECT 1
                FROM "BillCreditApplication" credit_application
                WHERE credit_application."billId" = bill."id"
            ) AS "isEligibleToRemainBilled",
        ROW_NUMBER() OVER (
            PARTITION BY item."studentChargeId"
            ORDER BY
                CASE
                    WHEN bill."status" <> 'CANCELLED'
                        OR EXISTS (
                            SELECT 1
                            FROM "Payment" payment
                            WHERE payment."billId" = bill."id"
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM "BillCreditApplication" credit_application
                            WHERE credit_application."billId" = bill."id"
                        )
                    THEN 0
                    ELSE 1
                END,
                bill."createdAt",
                item."createdAt",
                item."id"
        ) AS "rank"
    FROM "BillItem" item
    JOIN "Bill" bill ON bill."id" = item."billId"
    WHERE item."studentChargeId" IS NOT NULL
)
INSERT INTO "StudentChargeApplication" (
    "id",
    "studentChargeId",
    "billId",
    "billItemId",
    "isActive",
    "releasedAt",
    "releaseReason"
)
SELECT
    'legacy_sca_' || "billItemId",
    "studentChargeId",
    "billId",
    "billItemId",
    "rank" = 1 AND "isEligibleToRemainBilled",
    CASE
        WHEN "rank" = 1 AND "isEligibleToRemainBilled" THEN NULL
        ELSE CURRENT_TIMESTAMP
    END,
    CASE
        WHEN "rank" = 1 AND "isEligibleToRemainBilled" THEN NULL
        WHEN "isEligibleToRemainBilled" THEN 'LEGACY_DUPLICATE'
        ELSE 'CANCELLED_UNPAID'
    END
FROM ranked_applications;

CREATE UNIQUE INDEX "StudentChargeApplication_one_active_per_charge_key"
ON "StudentChargeApplication"("studentChargeId")
WHERE "isActive" = true;
