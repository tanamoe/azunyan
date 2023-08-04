FROM node:18.17.0

WORKDIR /app

# deps: install ffmpeg
RUN apt update -y && apt install -y ffmpeg

# install pnpm
RUN npm i -g pnpm

# copy package.json and its lockfile
COPY ["package.json", "pnpm-lock.yaml", "./"]

# install the dependencies
RUN pnpm install --frozen-lockfile

# copy source file
COPY . .

# build the source file
RUN ["pnpm", "build"]

# run the bot
CMD ["pnpm", "start"]
