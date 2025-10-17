# Build and run Next.js app
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install

FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm", "run", "start"]