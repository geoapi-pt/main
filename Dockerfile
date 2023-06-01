FROM node:16-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# RUN npm install
# If you are building your code for production
RUN npm ci --omit=dev

RUN npm install pm2 -g

# Bundle app source
COPY . .

ENV NODE_ENV production
EXPOSE 8080
CMD [ "pm2-runtime", "src/server/index.js", "--", "--buildFeAssets", "--port", "8080" ]
