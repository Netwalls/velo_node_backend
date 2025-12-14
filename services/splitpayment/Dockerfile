FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Install all dependencies (including devDependencies) to allow building
RUN npm install

COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the service port
EXPOSE 3004

# Start the application
CMD ["npm", "start"]
