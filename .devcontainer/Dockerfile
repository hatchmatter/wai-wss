FROM node:20

# Set the working directory in the container
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./

RUN npm install

COPY . .

# Create a non-root user and change the ownership of the working directory
RUN useradd --create-home vscode \
    && chown -R vscode:vscode /usr/src/app

# Change to non-root privilege
USER vscode

CMD ["npm", "run", "dev"]
