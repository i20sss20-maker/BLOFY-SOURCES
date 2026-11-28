# BLOFY private HTTP/HLS read-through edge. No provider credentials, no
# transcoding and no public port/domain. Reuses HLS from the licensed Origin
# instead of re-muxing RTP packets on a second MediaMTX instance.
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY index.mjs /app/index.mjs
EXPOSE 8888
USER node
CMD ["node", "/app/index.mjs"]
