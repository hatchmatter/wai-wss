FROM node:lts
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g tsx
COPY . .
CMD ["npm", "run", "dev"]
