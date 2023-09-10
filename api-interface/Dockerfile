FROM node:20-alpine as base

WORKDIR /home/node/app

RUN apk update && apk upgrade
COPY ./package.json package.json
COPY ./tsconfig.json tsconfig.json
COPY ./error.js error.js
RUN npm i npm@10.0.0
RUN npm i
COPY . .

FROM base as production
ENV NODE_PATH=./build
RUN npm run build