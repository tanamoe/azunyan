FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS base
COPY --from=ghcr.io/pnpm/pnpm:12.16.1-alpine@sha256:3b67e34454e18e4797a50ade3176dde31cec13ad6670f460a81bdf6e1d8b547b /opt/pnpm /opt/pnpm
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

FROM cgr.dev/chainguard/node:latest@sha256:6cb70d6b2a324e491263949ea9f58938ed19031ef478e0bdb0b1810f96f8b400
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

# run the bot
ENTRYPOINT ["node", "build/app.js"]
