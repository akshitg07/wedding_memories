# =========================================================
# Stage 1: Dependencies and Build
# =========================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy manifests
COPY package.json package-lock.json* ./

# Install standard dependencies
RUN npm ci

# Copy full application codebase
COPY . .

# Run production build compilation
# This compiles Vite frontend to /dist AND bundles server.ts into dist/server.cjs
RUN NODE_ENV=production npm run build

# Prune devDependencies to keep container footprint small
RUN npm prune --production

# =========================================================
# Stage 2: Minimal Production Runner
# =========================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Configure environmental production defaults
ENV NODE_ENV=production
ENV PORT=3000

# Copy compiled folders from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create uploads storage and database volume directories
RUN mkdir -p /app/data/uploads

# Expose container network ingress port
EXPOSE 3000

# Start server
CMD ["node", "dist/server.cjs"]
