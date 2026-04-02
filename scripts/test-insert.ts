import { drizzle } from 'drizzle-orm/postgres-js';
import { maintenanceRequests } from '../drizzle/schema';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function testInsert() {
  console.log('Testing insert...');
  try {
    const result = await db.insert(maintenanceRequests).values({
      title: 'Test insert',
      description: 'Test description',
      priority: 'alta',
      type: 'correctiva',
      spaceId: 1,
      createdBy: 1
    }).returning({ id: maintenanceRequests.id });
    console.log('Success! Inserted ID:', result);
  } catch (error: any) {
    console.error('Error:', error.message || error);
  }
  process.exit(0);
}

testInsert();
