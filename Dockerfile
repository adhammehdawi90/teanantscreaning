FROM node:18-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

# Copy the rest of the codebase
COPY . .

# Build both server (TypeScript) and client (Vite)
RUN npm run build

# Create a simple script to fix imports
RUN echo '#!/bin/sh\nsed -i "s/import\\(.*\\)from \\"\\.\\/routes\\"/import\\1from \\".\\\/routes.js\\"/g" dist/server/index.js' > fix-imports.sh && \
    chmod +x fix-imports.sh && \
    ./fix-imports.sh

# Create production image
FROM node:18-alpine AS production

WORKDIR /app

# Copy built assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/server/package.json ./dist/server/

# Install production dependencies
RUN npm ci --omit=dev

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Command to run the application with ESM support
CMD ["node", "--experimental-specifier-resolution=node", "dist/server/index.js"]