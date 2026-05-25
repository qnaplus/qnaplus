FROM node:26.2.0-alpine3.23 AS build

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
&& pnpm --filter @qnaplus/updater --prod deploy out \
&& mv /app/.npmrc out

# =======================================================

FROM debian:13-slim AS certs
RUN apt-get update \
&& apt-get -y install libnss3 nss-plugin-pem ca-certificates --no-install-recommends \
&& update-ca-certificates

# =======================================================

FROM gcr.io/distroless/nodejs26-debian13:debug

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# TODO: required for curl-impersonate, but is there a better way to do this?
COPY --from=certs /etc/ssl/certs /etc/ssl/certs
COPY --from=certs /usr/lib/x86_64-linux-gnu/libfreebl3.chk /usr/lib/x86_64-linux-gnu/libfreebl3.chk
COPY --from=certs /usr/lib/x86_64-linux-gnu/libfreebl3.so /usr/lib/x86_64-linux-gnu/libfreebl3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libfreeblpriv3.chk /usr/lib/x86_64-linux-gnu/libfreeblpriv3.chk
COPY --from=certs /usr/lib/x86_64-linux-gnu/libfreeblpriv3.so /usr/lib/x86_64-linux-gnu/libfreeblpriv3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libnss3.so /usr/lib/x86_64-linux-gnu/libnss3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libnssckbi.so /usr/lib/x86_64-linux-gnu/libnssckbi.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libnssdbm3.chk /usr/lib/x86_64-linux-gnu/libnssdbm3.chk
COPY --from=certs /usr/lib/x86_64-linux-gnu/libnssdbm3.so /usr/lib/x86_64-linux-gnu/libnssdbm3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libnssutil3.so /usr/lib/x86_64-linux-gnu/libnssutil3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libsmime3.so /usr/lib/x86_64-linux-gnu/libsmime3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libsoftokn3.chk /usr/lib/x86_64-linux-gnu/libsoftokn3.chk
COPY --from=certs /usr/lib/x86_64-linux-gnu/libsoftokn3.so /usr/lib/x86_64-linux-gnu/libsoftokn3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libssl3.so /usr/lib/x86_64-linux-gnu/libssl3.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libnspr4.so /usr/lib/x86_64-linux-gnu/libnspr4.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libplc4.so /usr/lib/x86_64-linux-gnu/libplc4.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libplds4.so /usr/lib/x86_64-linux-gnu/libplds4.so
COPY --from=certs /usr/lib/x86_64-linux-gnu/libsqlite3.so.0 /usr/lib/x86_64-linux-gnu/libsqlite3.so.0
COPY --from=certs /usr/lib/x86_64-linux-gnu/nss/libnsspem.so /usr/lib/x86_64-linux-gnu/nss/libnsspem.so
COPY --from=build /app/out/dist /app/dist
COPY --from=build /app/out/node_modules /app/node_modules

WORKDIR /app

CMD ["dist/index.js"]
