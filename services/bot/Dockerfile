FROM node:22.14.0-alpine3.21 AS base

RUN npm i -g corepack@latest

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN corepack use pnpm@10.6.5

WORKDIR /app
COPY . .

# =======================================================

FROM base AS pruned

RUN pnpm i
RUN pnpm build

ENV NODE_ENV=production
RUN pnpm --filter @qnaplus/updater --prod deploy pruned

# =======================================================

FROM base AS build

WORKDIR /app

COPY --from=pruned /app/pruned .
COPY --from=pruned /app/.env.vault .
COPY --from=base /app/.npmrc .

# =======================================================

FROM gcr.io/distroless/nodejs22-debian12 AS prod

COPY --from=build /app /app

WORKDIR /app/services/bot

CMD ["dist/index.js"]
