import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

const DATABASE_URL = process.env.DATABASE_URL;
const pool = mysql.createPool(DATABASE_URL);
const db = drizzle(pool);

console.log('Testing query: SELECT from users WHERE email = andrew@aisimple.co');

try {
  const result = await db.select().from(users).where(eq(users.email, 'andrew@aisimple.co')).limit(1);
  console.log('✓ Query successful!');
  console.log('Result:', result);
} catch (error) {
  console.error('✗ Query failed:', error.message);
  console.error('Error code:', error.code);
  console.error('SQL:', error.sql);
}

await pool.end();
