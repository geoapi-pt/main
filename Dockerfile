FROM node:16-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# RUN npm install
# If you are building your code for production
RUN npm ci

# Bundle app source
COPY src/ ./src
COPY routines/ ./routines
COPY configs.json .

ENV NODE_ENV production
EXPOSE 8080
USER nobody
CMD [ "npm", "start" ]
