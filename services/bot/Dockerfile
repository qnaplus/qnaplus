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

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i
RUN pnpm build

ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @qnaplus/bot --prod deploy out \
&& mv /app/.env.vault out \
&& mv /app/.npmrc out

# =======================================================

FROM gcr.io/distroless/nodejs22-debian12 AS prod

COPY --from=build /app/out /app

WORKDIR /app

CMD ["dist/index.js"]
