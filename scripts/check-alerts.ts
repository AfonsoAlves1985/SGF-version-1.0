import { drizzle } from 'drizzle-orm/postgres-js';
import { consumablesWithSpace } from '../drizzle/schema';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function checkAlerts() {
  const consumables = await db.select().from(consumablesWithSpace);
  console.log('Consumables:', JSON.stringify(consumables, null, 2));
  
  const alerts = consumables
    .map((c: any) => {
      const currentStock = c.currentStock || 0;
      const minStock = c.minStock || 0;
      console.log(`${c.name}: current=${currentStock}, min=${minStock}, below=${currentStock < minStock}`);
      return null;
    });
    
  process.exit(0);
}

checkAlerts();
