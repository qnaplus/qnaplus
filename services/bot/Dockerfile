FROM node:26.2.0-alpine3.22 AS base

RUN npm i -g corepack@latest

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app
COPY . .

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile \
&& pnpm build --inlineSourceMap \
&& pnpm clean \
&& pnpm i --frozen-lockfile --prod \
&& find . -name '*.d.ts' -delete \
&& pnpm --filter @qnaplus/bot --prod deploy out \
&& mv /app/.npmrc out

# =======================================================

FROM gcr.io/distroless/nodejs26-debian13

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

COPY --from=build /app/out /app

WORKDIR /app

CMD ["dist/index.js"]
