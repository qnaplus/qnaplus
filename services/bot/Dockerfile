FROM node:22.13.1-alpine3.21 AS base

RUN npm i -g corepack@latest

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN pnpm add --global turbo@2.4.0

WORKDIR /app
COPY . .

# =======================================================

FROM base AS pruned

RUN turbo prune @qnaplus/updater --docker

# =======================================================

FROM base AS build

WORKDIR /app

COPY --from=pruned /app/out/json/ .
COPY --from=pruned /app/.env.vault .
COPY --from=base /app/.npmrc .

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile

COPY --from=pruned /app/out/full/ .
RUN pnpm turbo run build:production

RUN find . -name node_modules -exec rm -rf {} +;

ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --prod

# =======================================================

FROM gcr.io/distroless/nodejs22-debian12 AS prod

COPY --from=build /app /app

WORKDIR /app/services/bot

CMD ["dist/index.js"]
