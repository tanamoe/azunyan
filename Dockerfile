FROM node:20.9

# deps: install ffmpeg
RUN apt update -y && apt install -y ffmpeg

# copy dirs
COPY . /app
WORKDIR /app

RUN npm install -g pnpm

# install the dependencies
RUN pnpm install --frozen-lockfile

# build the bot
RUN pnpm run build

# run the bot
CMD ["pnpm", "start"]
