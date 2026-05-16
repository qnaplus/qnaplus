FROM node:22.14.0-bookworm-slim AS base

RUN apt-get update
RUN apt-get -y install libnss3-dev ca-certificates python3
RUN update-ca-certificates

RUN npm i -g corepack@latest

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN corepack use pnpm@11.1.2

WORKDIR /app
COPY . .

# =======================================================

FROM base AS build

# Hoisted mode so pnpm physically copies platform-specific optional binaries
# instead of leaving them as symlinks that break across the cache-mount boundary.
RUN printf '\nnodeLinker: hoisted\n' >> pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile
RUN pnpm build

ENV NODE_ENV=production
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm --filter @qnaplus/updater --prod deploy out \
&& mv /app/.npmrc out

# =======================================================

FROM node:22.14.0-bookworm-slim AS prod

# Pin to a specific Infisical CLI release in production.
RUN npm install -g @infisical/cli@0.43.84

COPY --from=build /app/out /app
WORKDIR /app

# Replace <INFISICAL_PROJECT_ID> with the actual project ID from Infisical.
# Auth happens via INFISICAL_CLIENT_ID / INFISICAL_CLIENT_SECRET env vars set at runtime.
CMD ["/usr/local/bin/infisical", "run", "--projectId", "1e4a9be2-aaf8-4e0b-be53-185dac145515", "--env", "prod", "--", "node", "dist/index.js"]
