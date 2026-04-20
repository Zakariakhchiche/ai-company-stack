FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PATH=/opt/hermes/.venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN apt-get update -qq \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl git python3 python3-pip python3-venv jq \
 && rm -rf /var/lib/apt/lists/*

RUN npm install -g --silent paperclipai@latest typescript@5

RUN python3 -m venv /opt/hermes/.venv \
 && /opt/hermes/.venv/bin/pip install --quiet --upgrade pip \
 && /opt/hermes/.venv/bin/pip install --quiet git+https://github.com/NousResearch/hermes-agent.git \
 && ln -sf /opt/hermes/.venv/bin/hermes /usr/local/bin/hermes

RUN useradd -m -s /bin/bash -u 1001 pcrun || true

EXPOSE 3100

WORKDIR /data
