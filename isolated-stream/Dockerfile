FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json ./
COPY src ./src
COPY edge-function ./edge-function
COPY read-replica ./read-replica
COPY test ./test
RUN npm test
USER node
EXPOSE 3000
CMD ["node","src/server.mjs"]
