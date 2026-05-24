FROM node:22.14.0-bookworm-slim AS base

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

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @qnaplus/updater --prod deploy out \
&& mv /app/.npmrc out \
&& mv /app/services/start.sh out

# =======================================================

FROM node:22.14.0-bookworm-slim AS infisical-cli
RUN npm install -g @infisical/cli@0.43.84

# =======================================================

FROM node:22.14.0-bookworm-slim

RUN apt-get update
RUN apt-get -y install libnss3-dev ca-certificates
RUN update-ca-certificates

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

COPY --from=infisical-cli /usr/local/bin/infisical /usr/local/bin/infisical
COPY --from=build /app/out /app
WORKDIR /app
RUN chmod +x start.sh

CMD ["./start.sh"]
