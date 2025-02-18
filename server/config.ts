// config.ts
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define uploads directory path relative to server root
const uploadsDir = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o755 }); // Set proper permissions
}

export const config = {
  uploads: {
    directory: uploadsDir,
    publicPath: '/uploads',
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: ['video/webm', 'video/mp4']
  },
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  }
};