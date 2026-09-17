FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY . .
RUN mkdir -p /data && chown -R node:node /app /data
USER node
EXPOSE 8080
CMD ["npm","start"]
