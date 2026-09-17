FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# Persistent state lives in Azure Blob when managed identity is available.
# Local container storage is only a writable cache/fallback.
ENV DATA_DIR=/tmp/blofy-data
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run check && npm test
RUN npm prune --omit=dev && mkdir -p /tmp/blofy-data && chown -R node:node /app /tmp/blofy-data
USER node
EXPOSE 8080
CMD ["npm","start"]
