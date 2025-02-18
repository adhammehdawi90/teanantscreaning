import * as dotenv from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@shared/schema';

dotenv.config();

// Encode special characters in the password
const password = encodeURIComponent('Admin123#');
const connectionString = `postgres://postgres:${password}@0.0.0.0:5432/foras_assissments`;

// Configure client with detailed options
const client = postgres(connectionString, {
  max: 1,
  ssl: false,
  connect_timeout: 10,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  debug: (connection_id, message) => {
    console.log(`[PostgreSQL ${connection_id}] ${message}`);
  },
  onnotice: (notice) => {
    console.log('Database Notice:', notice);
  }
});

async function testConnection() {
  try {
    // Mask password in logs
    const maskedConnectionString = connectionString.replace(/:([^:@]+)@/, ':****@');
    console.log('Testing connection with:', maskedConnectionString);
    
    const result = await client`
      SELECT current_user, current_database(), pg_backend_pid() as backend_pid
    `;
    
    console.log('Connection successful:', result[0]);
    return true;
  } catch (error: any) {
    console.error('Connection failed:', {
      message: error.message,
      code: error.code,
      severity: error.severity,
      hint: error.hint,
      position: error.position
    });
    
    console.error('Please check:');
    console.error('1. Docker container is running:', 'docker ps | grep postgres');
    console.error('2. Port 5432 is properly mapped:', 'docker port my_postgres');
    console.error('3. No other PostgreSQL instance is running on port 5432');
    
    return false;
  }
}

(async () => {
  await testConnection();
})();

export const db = drizzle(client, { schema });
export { client };