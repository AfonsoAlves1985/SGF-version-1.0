import { drizzle } from 'drizzle-orm/postgres-js';
import { rooms } from '../drizzle/schema';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function checkRooms() {
  const roomsData = await db.select().from(rooms);
  console.log('Rooms with dates:', JSON.stringify(roomsData, null, 2));
  process.exit(0);
}

checkRooms();
