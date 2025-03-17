FROM node:22.13.1-alpine3.21 AS base

WORKDIR /app

RUN pnpm add -G turbo@2.4.0

COPY . .

RUN turbo prune @qnaplus/bot --docker

# =======================================================

FROM node:22.13.1-alpine3.21 AS build

WORKDIR /app

COPY --from=base /app/out/json/ .
COPY --from=base /app/.env.vault .


RUN pnpm i --frozen-lockfile

COPY --from=base /app/out/full/ .
RUN pnpm turbo run build:production

RUN find . -name node_modules -exec rm -rf {} +;

ENV NODE_ENV=production
RUN pnpm install --prod

# =======================================================

FROM gcr.io/distroless/nodejs22-debian12 AS prod

COPY --from=build /app /app

WORKDIR /app/services/bot

CMD ["dist/index.js"]
