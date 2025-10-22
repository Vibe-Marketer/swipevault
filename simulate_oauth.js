import mysql from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { users } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DATABASE_URL = process.env.DATABASE_URL;

console.log('=== Simulating OAuth Callback ===\n');

// Step 1: Create connection pool
console.log('Step 1: Creating connection pool...');
const pool = mysql.createPool(DATABASE_URL);
const db = drizzle(pool);
console.log('✓ Pool created\n');

// Step 2: Test connection
console.log('Step 2: Testing connection...');
try {
  await pool.query('SELECT 1');
  console.log('✓ Connection test passed\n');
} catch (err) {
  console.error('✗ Connection test failed:', err.message);
  process.exit(1);
}

// Step 3: Simulate user lookup by email (what the OAuth callback does)
const testEmail = 'andrew@aisimple.co';
console.log(`Step 3: Looking up user by email: ${testEmail}`);

try {
  const existingUser = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
  console.log('✓ Query successful');
  console.log('Result:', existingUser);
  console.log('User exists:', existingUser.length > 0);
} catch (err) {
  console.error('✗ Query failed:', err.message);
  console.error('Error code:', err.code);
  console.error('SQL:', err.sql);
  console.error('\nFull error:', err);
  await pool.end();
  process.exit(1);
}

// Step 4: Simulate upsert
console.log('\nStep 4: Simulating upsert...');
const userId = nanoid();

try {
  await db.insert(users).values({
    id: userId,
    email: testEmail,
    name: 'Test User',
    loginMethod: 'google',
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      name: 'Test User',
      lastSignedIn: new Date(),
    },
  });
  console.log('✓ Upsert successful');
} catch (err) {
  console.error('✗ Upsert failed:', err.message);
  console.error('Error code:', err.code);
  console.error('SQL:', err.sql);
}

// Cleanup
console.log('\nStep 5: Verifying user was created...');
const finalCheck = await db.select().from(users).where(eq(users.email, testEmail)).limit(1);
console.log('User record:', finalCheck[0]);

await pool.end();
console.log('\n=== Simulation Complete ===');
