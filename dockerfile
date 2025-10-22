FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY ./dist ./dist
CMD ["npm", "run", "start"]