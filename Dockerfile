FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build-env
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build-env /app/.next ./.next
COPY --from=build-env /app/public ./public
COPY --from=build-env /app/app ./app
COPY --from=build-env /app/next.config.ts ./next.config.ts
CMD ["npm", "run", "start"]
