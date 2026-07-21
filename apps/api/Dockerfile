FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/config/package.json packages/config/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/core-db/package.json packages/core-db/package.json
COPY packages/auth-core/package.json packages/auth-core/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @openspace-db/api...

FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @openspace-db/core-db db:generate
RUN pnpm --filter @openspace-db/api build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo
EXPOSE 4000
# Applies pending control-plane migrations before starting, so the image is
# self-sufficient on any platform (plain `docker run`, EasyPanel/Coolify/
# Railway single-service apps, ...) — not just under our own docker-compose,
# which used to override this via a `command:` that only it knew about.
CMD ["sh", "-c", "pnpm --filter @openspace-db/core-db exec prisma migrate deploy --schema prisma/schema.prisma && node apps/api/dist/server.js"]
