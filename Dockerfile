FROM node:26-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797 AS base
COPY --from=ghcr.io/pnpm/pnpm:12.16.1-alpine@sha256:3b67e34454e18e4797a50ade3176dde31cec13ad6670f460a81bdf6e1d8b547b /opt/pnpm /opt/pnpm
RUN for bin in pnpm pn pnpx pnx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done
COPY . /app
WORKDIR /app

FROM base AS prod-deps
ENV HUSKY=0
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --prod --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/var/cache/pnpm \
    pnpm install --store-dir /var/cache/pnpm --frozen-lockfile
RUN pnpm run build

FROM cgr.dev/chainguard/node:latest@sha256:efa14a42578e5931c351eb562ee2bed3e9c55e9abbfd683e218c88ab3889bcba
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

# run the bot
ENTRYPOINT ["node", "build/app.js"]
