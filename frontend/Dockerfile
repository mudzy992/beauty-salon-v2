FROM node:20-alpine AS build

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_API_FILES_URL

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_FILES_URL=${VITE_API_FILES_URL}

RUN npm run build


FROM nginx:alpine AS runtime

WORKDIR /usr/share/nginx/html

COPY --from=build /usr/app/dist ./
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
