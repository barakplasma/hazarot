FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:runtime && npm run typecheck

FROM --platform=$BUILDPLATFORM registry.access.redhat.com/ubi10/ubi:latest AS celld
ARG CELLD_VERSION=0.6.3
ARG TARGETARCH
RUN set -eux; \
    case "$TARGETARCH" in amd64) arch=x86_64 ;; arm64) arch=aarch64 ;; *) echo "Unsupported architecture: $TARGETARCH" >&2; exit 1 ;; esac; \
    curl -fsSL "https://github.com/denoland/celld/releases/download/v${CELLD_VERSION}/celld-${arch}-unknown-linux-gnu.gz" | gzip -dc > /celld; \
    chmod 755 /celld

# ubi-minimal, not ubi-micro: start-runtime.sh needs sed.
FROM registry.access.redhat.com/ubi10/ubi-minimal:latest
COPY --from=celld /celld /usr/local/bin/celld
WORKDIR /app
COPY --from=build --chown=10001:10001 /build/.build/runtime/ /app/
COPY --chown=10001:10001 scripts/start-runtime.sh /app/start-runtime.sh
RUN mkdir -p /app/.celld && chmod 755 /app/start-runtime.sh && chown -R 10001:10001 /app
USER 10001:10001
ENV HOME=/app HOST=0.0.0.0 PORT=9876
EXPOSE 9876
ENTRYPOINT ["/app/start-runtime.sh"]
