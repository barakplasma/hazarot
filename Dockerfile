FROM node:24-bookworm-slim
ARG CELLD_VERSION=v0.6.3
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gzip \
    && rm -rf /var/lib/apt/lists/* \
    && case "$(dpkg --print-architecture)" in amd64) target=x86_64-unknown-linux-gnu ;; arm64) target=aarch64-unknown-linux-gnu ;; *) exit 1 ;; esac \
    && curl -fsSL "https://github.com/denoland/celld/releases/download/${CELLD_VERSION}/celld-${target}.gz" -o /tmp/celld.gz \
    && gzip -dc /tmp/celld.gz > /usr/local/bin/celld \
    && chmod 755 /usr/local/bin/celld && rm /tmp/celld.gz
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm run typecheck \
    && useradd --uid 10001 --create-home rehearsal \
    && mkdir -p /app/.celld && chown -R 10001:10001 /app
USER 10001:10001
ENV HOST=0.0.0.0 PORT=9876
EXPOSE 9876
CMD ["npm", "run", "dev"]
