FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
RUN pnpm install --frozen-lockfile --filter @openspace-db/dashboard...

FROM deps AS build
COPY packages/config ./packages/config
COPY packages/shared-types ./packages/shared-types
COPY apps/dashboard ./apps/dashboard
RUN pnpm --filter @openspace-db/dashboard build

FROM nginx:1.27-alpine AS runtime
# Which internal URL the API is reachable at — defaults to plain
# docker-compose (service name "api"). Override on platforms that assign a
# different internal hostname (EasyPanel, Coolify, Railway, ...), e.g.
# API_UPSTREAM=http://ferramentas_openspace-db-api:4000
ENV API_UPSTREAM=http://api:4000
COPY apps/dashboard/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
