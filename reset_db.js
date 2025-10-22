import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);

console.log('Dropping all tables...');

const tables = ['collection_swipes', 'swipe_tags', 'email_swipes', 'collections', 'connected_mailboxes', 'tags', 'job_logs', 'users'];

for (const table of tables) {
  try {
    await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`✓ Dropped ${table}`);
  } catch (err) {
    console.log(`✗ Failed to drop ${table}:`, err.message);
  }
}

console.log('\nAll tables dropped. Now run: pnpm drizzle-kit push');
await connection.end();
