import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Adding spaceId column to maintenance_requests...');
  
  try {
    await db.execute(sql`ALTER TABLE "maintenance_requests" ADD COLUMN "spaceId" integer DEFAULT 1 NOT NULL;`);
    console.log('Column added successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('Column already exists, skipping...');
    } else {
      console.error('Error:', error.message);
    }
  }

  try {
    await db.execute(sql`ALTER TABLE "maintenance_requests" ADD CONSTRAINT "maintenance_requests_spaceId_maintenance_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "maintenance_spaces"("id") ON DELETE cascade ON UPDATE no action;`);
    console.log('Foreign key added successfully!');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('Foreign key already exists, skipping...');
    } else {
      console.error('Error adding FK:', error.message);
    }
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrate();
