FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build the Next.js application with standalone output
# ESLint and TypeScript errors are ignored during build (configured in next.config.ts)
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]

