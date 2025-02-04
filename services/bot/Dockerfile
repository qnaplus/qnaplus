FROM node:22.13.1-alpine3.20 as base

WORKDIR /app

COPY packages packages
COPY services/bot services/bot

COPY package.json .
COPY yarn.lock .
COPY tsconfig.json .
COPY tsconfig.base.json .

RUN yarn install && yarn workspace @qnaplus/bot run build

# =======================================================

FROM node:22.13.1-alpine3.20 as production

WORKDIR /app

COPY --from=base /app/yarn.lock .
COPY --from=base /app/package.json .
COPY --from=base /app/dist dist
COPY .env.vault .

RUN yarn install --production

CMD yarn bot:start
