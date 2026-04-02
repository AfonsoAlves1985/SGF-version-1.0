import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function checkAndAddColumn() {
  console.log('Checking maintenance_requests table structure...');
  
  const result = await db.execute(sql`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'maintenance_requests'
    ORDER BY ordinal_position;
  `);
  
  console.log('Current columns:', result);
  process.exit(0);
}

checkAndAddColumn();
