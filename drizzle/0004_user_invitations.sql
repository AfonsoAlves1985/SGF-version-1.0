DO $$ BEGIN
 CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'revoked', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_invitations" (
 "id" serial PRIMARY KEY NOT NULL,
 "email" varchar(320) NOT NULL,
 "name" text,
 "role" "user_role" DEFAULT 'viewer' NOT NULL,
 "token" varchar(255) NOT NULL,
 "status" "invitation_status" DEFAULT 'pending' NOT NULL,
 "invitedByUserId" integer,
 "expiresAt" timestamp NOT NULL,
 "acceptedAt" timestamp,
 "createdAt" timestamp DEFAULT now() NOT NULL,
 "updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedByUserId_users_id_fk" FOREIGN KEY ("invitedByUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_invitations_email_idx" ON "user_invitations" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_invitations_token_idx" ON "user_invitations" USING btree ("token");
