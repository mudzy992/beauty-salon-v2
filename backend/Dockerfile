FROM node:22-alpine AS builder

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma generation needs a syntactically valid URL but never a real DB credential.
ENV DATABASE_PROVIDER=postgres
ENV DATABASE_URL=postgresql://prisma:generate-only@localhost:5432/beautysalon?schema=public

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

# DATABASE_URL and other credentials are injected only at container runtime.
ENV PORT=10001
ENV UPLOAD_ROOT=/usr/app/uploads
ENV JWT_EXPIRES_IN=7d

EXPOSE 10001

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/main.js"]
