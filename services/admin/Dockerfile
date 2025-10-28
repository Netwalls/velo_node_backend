FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
COPY . .
# Install dev dependencies so we can run the TypeScript dev server inside the container
# (sane for local development). For production images, replace with a multi-stage build
# that runs `npm run build` and then `node dist/server.js`.
RUN npm install
CMD ["npm", "run", "dev"]
