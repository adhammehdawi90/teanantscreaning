FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig*.json ./
COPY fix-imports.js ./
RUN npm ci

# Copy the rest of the codebase
COPY . .

# Build both server (TypeScript) and client (Vite)
RUN npm run build

# Fix import paths for ESM compatibility
RUN sed -i 's/from "\.\/routes"/from ".\/routes.js"/g' dist/server/index.js && \
    sed -i 's/from "\.\/vite"/from ".\/vite.js"/g' dist/server/index.js

# Create production image
FROM node:18-alpine AS production

WORKDIR /app

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/server/package.json ./dist/server/
COPY --from=build /app/docker-entrypoint.sh ./

# Make the entrypoint script executable
RUN chmod +x ./docker-entrypoint.sh

# Install production dependencies including vite
RUN npm ci --omit=dev && \
    npm install vite@latest --save-exact

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Use our entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]