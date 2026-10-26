FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:runtime && npm run typecheck

FROM ghcr.io/denoland/celld:0.6.3
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/.build/runtime/ /app/
COPY --chown=10001:10001 scripts/start-runtime.sh /app/start-runtime.sh
RUN mkdir -p /app/.celld && chmod 755 /app/start-runtime.sh && chown -R 10001:10001 /app
USER 10001:10001
ENV HOME=/app HOST=0.0.0.0 PORT=9876
EXPOSE 9876
ENTRYPOINT ["/app/start-runtime.sh"]
