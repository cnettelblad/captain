FROM node:lts-krypton
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY ./dist ./dist
COPY ./prisma ./prisma
COPY ./prisma.config.ts ./prisma.config.ts

RUN mkdir -p /app/database

VOLUME ["/app/database"]

CMD ["npm", "run", "start"]