#!/bin/sh
# Explicitly invoked one-shot QA on a media host. Does not inspect or alter
# production services, credentials, databases, firewall, or source accounts.
set -eu
cd "$(dirname "$0")/.."
command -v docker >/dev/null
tag="blofy-relay-local-qa:$(date +%s)-$$"
cleanup(){ docker image rm "$tag" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Build uses package registries only. Runtime has no external network;
# synthetic localhost HTTP is permitted inside the isolated container.
docker build -t "$tag" -f - . <<'DOCKER'
FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /qa
COPY src ./src
COPY test ./test
USER node
DOCKER
docker run --rm --network none --read-only --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --cap-drop ALL --security-opt no-new-privileges --cpus=2 --memory=768m --pids-limit=128 \
  "$tag" node --test test/live-ingress-queue.test.mjs test/live-ingress-session.test.mjs \
  test/live-fanout-native-isolation.test.mjs test/live-fanout-decoded-media.test.mjs \
  test/live-ts-clock-monitor.test.mjs
