FROM node:lts-alpine
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm install -g tsx
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]
