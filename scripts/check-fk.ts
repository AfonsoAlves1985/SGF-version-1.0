import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function checkFK() {
  console.log('Checking foreign keys on maintenance_requests...');
  
  const fkResult = await db.execute(sql`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'maintenance_requests';
  `);
  
  console.log('Foreign keys:', fkResult);

  console.log('\nChecking maintenance_spaces data...');
  const spaces = await db.execute(sql`SELECT * FROM maintenance_spaces;`);
  console.log('Maintenance spaces:', spaces);

  console.log('\nTrying insert...');
  try {
    await db.execute(sql`
      INSERT INTO maintenance_requests (title, description, priority, type, spaceId, createdBy)
      VALUES ('Teste', 'Teste desc', 'alta', 'correctiva', 1, 1)
    `);
    console.log('Insert successful!');
  } catch (error: any) {
    console.error('Insert error:', error.message);
  }
  
  process.exit(0);
}

checkFK();
