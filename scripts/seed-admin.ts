import { drizzle } from 'drizzle-orm/postgres-js';
import { users } from '../drizzle/schema';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL!);

async function seedAdmin() {
  console.log('Checking users...');
  
  const existingUsers = await db.select().from(users);
  console.log('Current users:', existingUsers);
  
  if (existingUsers.length === 0) {
    console.log('Creating admin user...');
    await db.insert(users).values({
      openId: 'admin-local',
      name: 'Administrador',
      email: 'admin@admin.com',
      loginMethod: 'password',
      password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890', // admin123 hash
      role: 'admin',
      isActive: true
    });
    console.log('Admin user created!');
  } else {
    console.log('Users already exist');
  }
  
  process.exit(0);
}

seedAdmin();
