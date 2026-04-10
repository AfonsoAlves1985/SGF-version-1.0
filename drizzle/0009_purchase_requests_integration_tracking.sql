ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationWebhookAttempts" integer DEFAULT 0 NOT NULL;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationWebhookLastAttemptAt" timestamp;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationWebhookLastDeliveredAt" timestamp;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationWebhookLastStatus" varchar(40);

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationWebhookLastStatusCode" integer;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationWebhookLastError" text;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationCallbackAttempts" integer DEFAULT 0 NOT NULL;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationCallbackLastAt" timestamp;

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationCallbackLastStatus" varchar(40);

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationCallbackLastDecision" varchar(20);

ALTER TABLE "purchase_requests"
ADD COLUMN IF NOT EXISTS "integrationCallbackLastError" text;
