FROM oven/bun:alpine as build

RUN apk update
RUN apk add python3 alpine-sdk

# copy dirs
COPY . /app
WORKDIR /app

# install the dependencies
RUN bun install --frozen-lockfile

FROM node:20.10.0-alpine as image

# deps: install runtime dependencies
RUN apk update
RUN apk add --no-cache ffmpeg

COPY --from=build /app /app
WORKDIR /app

# run the bot
CMD ["npm", "run", "start"]
