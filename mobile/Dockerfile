# Placeholder – mobilna app se obično ne radi u Dockeru; EAS Build za produkciju (Faza 8–9)
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci 2>/dev/null || true
COPY . .
EXPOSE 8081
CMD ["npx", "expo", "start", "--tunnel"]
