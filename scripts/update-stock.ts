import { drizzle } from 'drizzle-orm/postgres-js';
import { consumablesWithSpace } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function updateStock() {
  // Atualizar alguns itens para estar abaixo do mínimo
  await db.update(consumablesWithSpace)
    .set({ currentStock: 2 })
    .where(eq(consumablesWithSpace.id, 1));
    
  await db.update(consumablesWithSpace)
    .set({ currentStock: 0 })
    .where(eq(consumablesWithSpace.id, 2));
    
  console.log('Updated stock levels');
  process.exit(0);
}

updateStock();
