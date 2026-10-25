FROM node:22-alpine AS dependencies

WORKDIR /usr/app

COPY package*.json ./
RUN npm ci

FROM dependencies AS builder

COPY . .

# Prisma generation needs a syntactically valid URL but never a real DB credential.
ENV DATABASE_PROVIDER=postgres
ENV DATABASE_URL=postgresql://prisma:generate-only@localhost:5432/beautysalon?schema=public

RUN npx prisma generate
RUN npm run build

# Dedicated one-shot schema migration image. The database URL is supplied only
# when the migration container runs, never as a build argument or image ENV.
FROM dependencies AS migrator

COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

RUN addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app

USER 10001:10001
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# Install only runtime dependencies in a clean tree. Prisma Client declares
# its CLI and TypeScript as optional peers, so remove those build-only tools too.
FROM node:22-alpine AS production-dependencies
WORKDIR /usr/app
COPY package*.json ./
RUN npm ci --omit=dev \
    && rm -rf node_modules/prisma node_modules/typescript

FROM node:22-alpine AS runtime

WORKDIR /usr/app

ENV NODE_ENV=production
ENV PORT=10001
ENV UPLOAD_ROOT=/usr/app/uploads
ENV JWT_EXPIRES_IN=7d

RUN addgroup -S -g 10001 app \
    && adduser -S -u 10001 -G app app \
    && mkdir -p /usr/app/uploads/public /usr/app/uploads/private \
    && chown -R 10001:10001 /usr/app/uploads

COPY --from=production-dependencies --chown=10001:10001 /usr/app/node_modules ./node_modules
# Prisma Client is generated in the builder and is not a production npm dependency.
COPY --from=builder --chown=10001:10001 /usr/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=10001:10001 /usr/app/dist ./dist
COPY --from=builder --chown=10001:10001 /usr/app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=10001:10001 /usr/app/package.json ./package.json

EXPOSE 10001
USER 10001:10001

CMD ["node", "dist/src/main.js"]
