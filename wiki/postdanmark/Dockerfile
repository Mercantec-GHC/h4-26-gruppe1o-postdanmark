# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built application from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/app ./app
COPY --from=build /app/content ./content
COPY --from=build /app/lib ./lib
COPY --from=build /app/components ./components
COPY --from=build /app/next.config.mjs ./
COPY --from=build /app/postcss.config.mjs ./
COPY --from=build /app/tsconfig.json ./
COPY --from=build /app/source.config.ts ./
COPY --from=build /app/mdx-components.tsx ./

EXPOSE 4012

ENV PORT=4012
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
