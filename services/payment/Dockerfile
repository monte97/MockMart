# Use Node.js LTS version
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Expose port
EXPOSE 3010

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3010

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3010) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application with OpenTelemetry instrumentation
CMD ["node", "--require", "./instrumentation.js", "server.js"]
