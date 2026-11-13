FROM node:26-alpine@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216 AS base
COPY --from=ghcr.io/pnpm/pnpm:12.20.0-alpine@sha256:20ed5f022321634b3263e1945e86cb77b4620c9fa2883824c274e8937ee7d38b /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --frozen-lockfile
RUN pnpm run build

FROM cgr.dev/chainguard/node:latest@sha256:8828c6e74c782babb020e684f026a7747d91a0699e7f2a2163f905c47f65e4da
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

# run the bot
ENTRYPOINT ["node", "build/app.js"]
