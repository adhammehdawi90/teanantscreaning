// scripts/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

// Encode special characters in the password
const password = encodeURIComponent('Admin123#');
const connectionString = `postgres://postgres:${password}@0.0.0.0:5432/foras_assissments`;

const migrationClient = postgres(connectionString!, { max: 1 });

async function main() {
  try {
    console.log('Starting migration...');
    const db = drizzle(connectionString);
    
    await migrate(db, {
      migrationsFolder: './migrations'
    });
    
    console.log('Migration completed successfully');
  } catch (error) {
   console.error('Migration failed1')
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();