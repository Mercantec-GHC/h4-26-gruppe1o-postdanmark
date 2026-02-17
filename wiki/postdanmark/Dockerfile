# =============================================================================
# Wiki (Fumadocs/Next.js) - Multi-stage Docker Build
# =============================================================================
# Stage 1: Bygger Next.js-applikationen til en standalone-produktionspakke.
# Stage 2: Minimal runtime-billede med kun det, der skal bruges til at køre.
# =============================================================================

# --- Stage 1: BUILD ---
# Brug Node.js 20 Alpine (minimal Linux) som base
FROM node:20-alpine AS build

WORKDIR /app

# Kopiér kun package-filer først (udnytter Docker cache ved uændrede dependencies)
COPY package.json package-lock.json* ./
# Installer dependencies uden postinstall (fumadocs-mdx kræver source.config.ts som ikke er kopieret endnu)
# Postinstall køres manuelt efter COPY af kildekode nedenfor
RUN npm ci --ignore-scripts

# Kopiér resten af kildekoden (source.config.ts, content/, osv.)
COPY . .
# Kør fumadocs-mdx manuelt - genererer .source/ fra source.config.ts (nødvendigt før next build)
RUN npx fumadocs-mdx

# Byg appen - next.config har output: 'standalone' som laver en selvstændig pakke
RUN npm run build

# --- Stage 2: RUNNER ---
# Nyt billede - build-artefakter inkl. node_modules bliver IKKE med (mindre billede)
FROM node:20-alpine AS runner

# libc6-compat kræves af Node.js/Next.js på Alpine for nogle native moduler
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Produktionsmiljø og slå Next.js telemetri fra
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Opret non-root bruger (sikkerhedsbest practice - kør ikke som root i container)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Kopiér standalone-output fra build-stage (indeholder server.js + runtime-deps)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
# Public assets (filer, billeder osv.)
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Statisk Next.js output (CSS, JS chunks)
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Skift til non-root bruger før kørsel
USER nextjs

# Port 3000 er standard for Next.js server
EXPOSE 3000

# Bind til alle interfaces (0.0.0.0) så containeren kan modtage trafik udefra
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start Next.js server (server.js genereres af standalone-build)
CMD ["node", "server.js"]
