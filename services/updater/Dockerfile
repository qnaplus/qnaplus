FROM node:22.13.1-alpine3.20 AS base

WORKDIR /app

RUN yarn global add turbo@2.4.0

COPY . .

RUN turbo prune @qnaplus/updater --docker

# =======================================================

FROM node:22.13.1-alpine3.20 AS build

WORKDIR /app

COPY --from=base /app/out/json/ .
RUN yarn install --frozen-lockfile
 
COPY --from=base /app/out/full/ .
RUN yarn turbo run build

CMD ["yarn", "updater:start"]
