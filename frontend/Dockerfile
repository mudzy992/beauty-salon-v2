FROM node:20-alpine AS build

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine AS runtime

WORKDIR /usr/share/nginx/html

COPY --from=build /usr/app/dist ./
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 10000
