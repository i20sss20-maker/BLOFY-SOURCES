FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Persistent state lives in Azure Blob when managed identity is available.
# Local container storage is only a writable cache/fallback.
ENV DATA_DIR=/tmp/blofy-data
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN chmod 755 /app/docker-entrypoint.sh
RUN npm run check && npm test
RUN npm prune --omit=dev && mkdir -p /tmp/blofy-data && chown -R node:node /app /tmp/blofy-data
USER root
EXPOSE 8080
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node","src/server.mjs"]
