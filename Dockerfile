FROM oven/bun as build

RUN apt update
RUN apt install -y python3 build-essential git

# copy dirs
COPY . /app
WORKDIR /app

# install the dependencies
RUN bun install --frozen-lockfile
RUN bun run build

FROM node:20.14.0 as image

# deps: install runtime dependencies
RUN apt update
RUN apt install -y ffmpeg

COPY --from=build /app /app
WORKDIR /app

# run the bot
CMD ["npm", "run", "start"]
