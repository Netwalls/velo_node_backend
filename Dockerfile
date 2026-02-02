# ---- Build Stage ----
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --frozen-lockfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./
# If you want to include migrations, scripts, etc, add more COPY lines as needed
EXPOSE 5500
CMD ["node", "dist/server.js"]
