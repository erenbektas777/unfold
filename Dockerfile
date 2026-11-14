FROM node:22-alpine AS base
WORKDIR /app

# Bağımlılıkları kur
COPY package.json package-lock.json ./
RUN npm ci

# Uygulamayı derle
COPY . .
RUN npm run build

# Veritabanı dizinini hazırla (Kalıcı Volume /app/.data üzerine bağlanabilir)
RUN mkdir -p /app/.data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
