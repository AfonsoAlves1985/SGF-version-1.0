import { drizzle } from 'drizzle-orm/postgres-js';
import { maintenanceRequests } from '../drizzle/schema';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function checkMaintenance() {
  const requests = await db.select().from(maintenanceRequests);
  console.log('Total requests:', requests.length);
  console.log('Requests:', JSON.stringify(requests, null, 2));
  process.exit(0);
}

checkMaintenance();
