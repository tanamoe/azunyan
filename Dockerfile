FROM node:21.3-alpine

# deps: install runtime dependencies
RUN apk update
RUN apk add --no-cache ffmpeg python3 alpine-sdk

# enable node's corepack, install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# copy dirs
COPY . /app
WORKDIR /app

# install the dependencies
RUN pnpm install --frozen-lockfile

# run the bot
CMD ["pnpm", "start"]
