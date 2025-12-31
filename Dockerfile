# Stage 1: Build the application
FROM node:18 AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Install only production dependencies
RUN npm prune --production

# Stage 2: Serve the application
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy the production dependencies and build output from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the default Next.js port
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]