FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

ARG VITE_MAP_API_BASE_URL=/api/map
ARG VITE_NEWS_API_BASE_URL=/api/news
ARG VITE_UMAMI_SRC=/analytics/script.js
ARG VITE_UMAMI_WEBSITE_ID=
ENV VITE_MAP_API_BASE_URL=$VITE_MAP_API_BASE_URL \
    VITE_NEWS_API_BASE_URL=$VITE_NEWS_API_BASE_URL \
    VITE_UMAMI_SRC=$VITE_UMAMI_SRC \
    VITE_UMAMI_WEBSITE_ID=$VITE_UMAMI_WEBSITE_ID

COPY . .
RUN pnpm build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /usr/share/caddy

RUN addgroup -S app \
    && adduser -S -D -H -G app app \
    && chown -R app:app /usr/share/caddy /data /config

USER app
