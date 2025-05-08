#!/bin/sh
set -e

# Create a simple logger function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting TalentScreenPro application"

# Check if the server directory exists
if [ ! -d "/app/dist/server" ]; then
  log "Error: Server directory not found at /app/dist/server"
  exit 1
fi

# Check if index.js exists
if [ ! -f "/app/dist/server/index.js" ]; then
  log "Error: Server index.js not found"
  exit 1
fi

# Ensure server directory has package.json with type=module
if [ ! -f "/app/dist/server/package.json" ]; then
  log "Warning: Creating package.json in server directory"
  echo '{"type":"module"}' > /app/dist/server/package.json
fi

# Fix any potential import issues
log "Checking for ESM import issues"
sed -i 's/from "\.\/routes"/from ".\/routes.js"/g' /app/dist/server/index.js
sed -i 's/from "\.\/vite"/from ".\/vite.js"/g' /app/dist/server/index.js

# Start the application
log "Launching application"
exec node --experimental-specifier-resolution=node /app/dist/server/index.js 