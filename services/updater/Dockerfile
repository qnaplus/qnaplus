FROM node:22.13.1-alpine3.20 AS build

WORKDIR /app

COPY packages packages
COPY services/updater services/updater

COPY package.json .
COPY yarn.lock .
COPY tsconfig.json .
COPY tsconfig.base.json .

RUN yarn install && yarn workspace @qnaplus/updater run build

# =======================================================

# TODO: try and find a slimmer image that still supports ts-curl-impersonate linked libraries
FROM node:22.13.1 AS production

WORKDIR /app

COPY --from=build /app/yarn.lock .
COPY --from=build /app/package.json .
COPY --from=build /app/services/updater/dist services/updater/dist
COPY --from=build /app/packages/**/dist services/updater/dist
COPY .env.vault .

RUN yarn install --production

CMD yarn updater:start
