import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

console.log('Connecting to database...');

const connection = await mysql.createConnection(DATABASE_URL);

console.log('Connected! Checking tables...');

const [tables] = await connection.query('SHOW TABLES');
console.log('Tables:', tables);

if (tables.length === 0) {
  console.log('\n⚠️  NO TABLES FOUND! Need to run migrations.');
} else {
  console.log('\n✓ Tables exist. Checking users table...');
  const [columns] = await connection.query('DESCRIBE users');
  console.log('Users table structure:', columns);
}

await connection.end();
