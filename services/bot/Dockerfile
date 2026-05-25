FROM node:22.14.0-alpine3.21 AS base

RUN npm i -g corepack@latest

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN corepack use pnpm@11.1.2

WORKDIR /app
COPY . .

# =======================================================

FROM base AS build

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN printf '\nnodeLinker: hoisted\n' >> pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile
RUN pnpm build

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @qnaplus/bot --prod deploy out \
&& mv /app/.npmrc out

# =======================================================

FROM gcr.io/distroless/nodejs22-debian12

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

COPY --from=build /app/out /app

WORKDIR /app

CMD ["dist/index.js"]
