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
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
