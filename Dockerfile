# Single-service build: the Vite frontend is built into backend/public, then the
# Hono backend is compiled, and Node serves both from one process.
FROM node:20

WORKDIR /app

# Install root (frontend) deps first, using the lockfile for a reproducible build.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Install backend deps.
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --include=dev

# Copy the rest of the source. node_modules / build outputs are excluded via
# .dockerignore so the installs above are preserved.
COPY . .

# Build the frontend into backend/public, then compile the backend to dist/.
RUN npm run build
RUN cd backend && npm run build

ENV NODE_ENV=production

# Railway injects PORT; the server reads process.env.PORT.
# migrate (fatal) -> seed (idempotent, non-fatal) -> start.
CMD ["sh", "-c", "cd backend && node dist/db/migrate.js && (node dist/db/seed.js || echo '[seed] skipped') && node dist/server.js"]
