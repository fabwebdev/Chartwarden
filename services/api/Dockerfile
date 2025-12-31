# =============================================================================
# Multi-Stage Dockerfile for Chartwarden API (Fastify Backend)
# Optimized for production with security and performance in mind
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS dependencies

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    build-base \
    postgresql-client

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --only=production && \
    npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 2: Builder
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY . .

# Remove unnecessary files
RUN rm -rf tests docs *.md .git .github docker

# -----------------------------------------------------------------------------
# Stage 3: Production Runtime
# -----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl \
    tini

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/storage /app/uploads && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "start.js"]

# -----------------------------------------------------------------------------
# Stage 4: Development
# -----------------------------------------------------------------------------
FROM node:20-alpine AS development

# Install development dependencies
RUN apk add --no-cache \
    python3 \
    py3-setuptools \
    make \
    g++ \
    build-base \
    postgresql-client \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy application source
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/storage /app/uploads

# Expose application port and debug port
EXPOSE 3001 9229

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start in development mode
CMD ["npm", "run", "dev"]
