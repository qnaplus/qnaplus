FROM node:22.13.1-alpine3.21 AS base

WORKDIR /app

RUN yarn global add turbo@2.4.0

COPY . .

RUN turbo prune @qnaplus/updater --docker

# =======================================================

FROM node:22.13.1-alpine3.21 AS build

WORKDIR /app

COPY --from=base /app/out/json/ .
COPY --from=base /app/.env.vault .


RUN yarn install --frozen-lockfile

COPY --from=base /app/out/full/ .
RUN yarn turbo run build

RUN find . -name node_modules -exec rm -rf {} +;

ENV NODE_ENV=production
RUN yarn install --production

# =======================================================

FROM node:22.13.1-bookworm-slim AS prod

COPY --from=build /app /app

WORKDIR /app

CMD ["node", "services/updater/dist/index.js"]
