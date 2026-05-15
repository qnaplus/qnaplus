FROM node:22.14.0-alpine3.21 AS base

RUN npm i -g corepack@latest

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN corepack use pnpm@10.6.5

WORKDIR /app
COPY . .

# =======================================================

FROM base AS build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile
RUN pnpm build

ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @qnaplus/bot --prod deploy out \
&& mv /app/.npmrc out

# =======================================================

# Pin to a specific Infisical CLI release in production.
FROM infisical/cli:0.43.84 AS infisical-cli

FROM gcr.io/distroless/nodejs22-debian12 AS prod

COPY --from=infisical-cli /usr/bin/infisical /usr/local/bin/infisical
COPY --from=build /app/out /app

WORKDIR /app

# Replace <INFISICAL_PROJECT_ID> with the actual project ID from Infisical.
# Auth happens via INFISICAL_CLIENT_ID / INFISICAL_CLIENT_SECRET env vars set at runtime.
CMD ["/usr/local/bin/infisical", "run", "--projectId", "1e4a9be2-aaf8-4e0b-be53-185dac145515", "--env", "prod", "--", "/nodejs/bin/node", "dist/index.js"]
