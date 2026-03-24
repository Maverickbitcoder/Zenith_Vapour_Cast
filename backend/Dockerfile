FROM node:20-alpine

WORKDIR /app

# Create necessary directories
RUN mkdir -p data/uploads

# Copy package files
COPY package*.json ./

# Install dependencies with production flag
RUN npm ci --only=production

# Copy application code
COPY . .

# Create data directory with proper permissions
RUN mkdir -p data/uploads && chmod 755 data

# Expose port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "index.js"]

