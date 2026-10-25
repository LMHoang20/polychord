FROM node:22-slim

# git for the clone, Claude Code for the work, and an unprivileged "agent" user
# for Claude to run as. /state (the clone and bot state) is root-only.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global @anthropic-ai/claude-code@2.1.310 \
  && npm cache clean --force \
  && useradd --uid 10001 --create-home --shell /usr/sbin/nologin agent \
  && mkdir -p /state && chmod 700 /state

ENV DISABLE_AUTOUPDATER=1
COPY bot.mjs /opt/bot/bot.mjs
CMD ["node", "/opt/bot/bot.mjs"]
