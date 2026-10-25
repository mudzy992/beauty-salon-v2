# Build context must be the repository root because frontend sources import ../shared.
FROM node:20-alpine AS build

WORKDIR /usr/app/frontend

COPY frontend/package*.json ./
RUN npm ci

WORKDIR /usr/app
COPY frontend ./frontend
COPY shared ./shared

WORKDIR /usr/app/frontend

ARG VITE_API_URL
ARG VITE_API_FILES_URL

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_API_FILES_URL=${VITE_API_FILES_URL}

RUN npm run build


FROM nginx:alpine AS runtime

WORKDIR /usr/share/nginx/html

COPY --from=build /usr/app/frontend/dist ./
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
