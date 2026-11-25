FROM alpine:3.22 AS engine-fixtures
RUN apk add --no-cache ffmpeg
COPY src/generate-engine-hd-fixtures.sh /generate.sh
RUN sh /generate.sh /fixtures

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json ./
COPY src ./src
COPY edge-function ./edge-function
COPY read-replica ./read-replica
COPY test ./test
COPY --from=engine-fixtures /fixtures /app/engine-fixtures
RUN npm test
USER node
EXPOSE 3000
CMD ["node","src/server.mjs"]
