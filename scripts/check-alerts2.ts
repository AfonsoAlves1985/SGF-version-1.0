import { drizzle } from 'drizzle-orm/postgres-js';
import { consumables } from '../drizzle/schema';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function check() {
  const data = await db.select().from(consumables);
  console.log('Consumables:', JSON.stringify(data, null, 2));
  process.exit(0);
}

check();
