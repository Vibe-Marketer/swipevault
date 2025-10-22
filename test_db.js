import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

console.log('Testing database connection...');
console.log('DATABASE_URL:', DATABASE_URL.substring(0, 30) + '...');

try {
  const pool = mysql.createPool(DATABASE_URL);
  const db = drizzle(pool);
  
  console.log('Pool created, testing query...');
  const result = await db.select().from(users).limit(1);
  console.log('Query successful! Result:', result);
  
  await pool.end();
  console.log('Connection closed');
} catch (error) {
  console.error('Database test failed:', error);
  process.exit(1);
}
