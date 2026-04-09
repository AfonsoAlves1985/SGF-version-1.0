ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "externalRequestId" varchar(120);

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "externalApprovalStatus" varchar(40);

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "externalApprovedBy" varchar(255);

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "externalApprovedAt" timestamp;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "externalApprovalReason" text;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "externalApprovalPayload" json;

CREATE INDEX IF NOT EXISTS "purchase_requests_external_request_idx"
ON "purchase_requests" ("externalRequestId");
