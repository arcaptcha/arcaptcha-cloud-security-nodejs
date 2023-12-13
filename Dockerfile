# Use a Node.js base image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Expose port 3000 for the application to listen on
EXPOSE 3000

ENV NODE_ENV='production'

# Start the application
CMD ["node", "examples/expressjs/index.js"]