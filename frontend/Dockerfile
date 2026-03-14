# Placeholder – puna build konfiguracija u Fazi 6 (Vite + Chakra)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev 2>/dev/null || true
COPY . .
ENV NODE_ENV=production
EXPOSE 10000
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "10000"]
