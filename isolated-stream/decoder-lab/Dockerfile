FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node test ./test
USER node
RUN node --test test/*.test.mjs
RUN node src/smoke.mjs
RUN node src/owner-sample-smoke.mjs
EXPOSE 3000
CMD ["node","src/server.mjs"]
