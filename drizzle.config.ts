import { defineConfig } from "drizzle-kit";


const password = encodeURIComponent('Admin123#');
const connectionString = `postgres://postgres:${password}@0.0.0.0:5432/foras_assissments`;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url:connectionString,
  },
});
