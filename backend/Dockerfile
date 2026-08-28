FROM node:22-alpine AS builder

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
COPY . .

# Prisma 7 prisma.config.ts zahtijeva DATABASE_URL.
# Ovo je samo build-time placeholder i NE koristi produkcijsku bazu.
ARG DATABASE_PROVIDER=postgres
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/beauty_salon_v2?schema=public

ENV DATABASE_PROVIDER=${DATABASE_PROVIDER}
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build


FROM node:22-alpine AS runtime

WORKDIR /usr/app

ENV NODE_ENV=production

COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/dist ./dist
COPY --from=builder /usr/app/package*.json ./
COPY --from=builder /usr/app/prisma ./prisma/
COPY --from=builder /usr/app/prisma.config.ts ./

# Build-time placeholder za Prisma config.
# Stvarni DATABASE_URL dolazi kroz docker-compose/Coolify runtime environment.
ARG DATABASE_PROVIDER=postgres
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/beauty_salon_v2?schema=public

ENV DATABASE_PROVIDER=${DATABASE_PROVIDER}
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate

ENV PORT=10001
ENV UPLOAD_ROOT=/usr/app/uploads
ENV JWT_EXPIRES_IN=7d

EXPOSE 10001

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
