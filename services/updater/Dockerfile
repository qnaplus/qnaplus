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
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @qnaplus/updater --prod deploy out \
&& mv /app/.env.vault out \
&& mv /app/.npmrc out

# =======================================================

FROM node:22.14.0-bookworm-slim AS prod

RUN apt-get update
RUN apt-get -y install libnss3-dev ca-certificates
RUN update-ca-certificates

COPY --from=build /app/out /app
WORKDIR /app

CMD ["node", "dist/index.js"]
