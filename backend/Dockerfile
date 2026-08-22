FROM node:22-alpine AS builder

WORKDIR /usr/app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
# Prisma 7 prisma.config.ts zahtijeva DATABASE_URL; generate ne koristi konekciju, pa je placeholder dovoljan
ENV DATABASE_PROVIDER="postgres"
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beauty_salon_v2?schema=public"
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /usr/app

COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/dist ./dist
COPY --from=builder /usr/app/package*.json ./
COPY --from=builder /usr/app/prisma ./prisma/
COPY --from=builder /usr/app/prisma.config.ts ./

# Prisma generate u runtime slici opet treba DATABASE_URL (config ga ucitava); prava vrijednost stize preko env u runtimeu
ENV DATABASE_PROVIDER="postgres"
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/beauty_salon_v2?schema=public"
RUN npx prisma generate

ENV NODE_ENV=production
# Defaulti; DATABASE_URL i JWT_SECRET obavezno predati u runtimeu (npr. env_file u docker-compose)
ENV PORT=10001
ENV UPLOAD_ROOT=/usr/app/uploads
ENV JWT_EXPIRES_IN=7d

EXPOSE 10001

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
