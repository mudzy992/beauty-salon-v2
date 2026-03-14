FROM node:22-alpine AS builder

WORKDIR /usr/app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine

WORKDIR /usr/app

COPY --from=builder /usr/app/node_modules ./node_modules
COPY --from=builder /usr/app/dist ./dist
COPY --from=builder /usr/app/package*.json ./
COPY --from=builder /usr/app/prisma ./prisma/
COPY --from=builder /usr/app/prisma.config.ts ./

RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 10001

CMD ["node", "dist/main.js"]
