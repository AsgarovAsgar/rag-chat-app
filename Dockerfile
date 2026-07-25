FROM node:22-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --frozen-lockfile
COPY apps ./apps
RUN pnpm --filter frontend build
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --legacy --prod /out

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/backend
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/migrations ./migrations
COPY --from=build /app/apps/frontend/dist /app/apps/frontend/dist
EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/node-pg-migrate up && node dist/main.js"]