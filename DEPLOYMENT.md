# Cloudflare Deployment (Pages + Workers)

This app can be deployed with static frontend on **Cloudflare Pages** and WebSocket relay on **Cloudflare Workers** (Durable Objects).

## 1) Deploy the Worker relay

Requirements:
- Wrangler installed (`npm i -g wrangler` or `npx wrangler`)
- Cloudflare account authenticated (`wrangler login`)

From repo root:

```bash
wrangler deploy
```

This uses:
- `wrangler.toml`
- `worker/relay-worker.js`
- Durable Object class `RelayRoom`

After deploy, note the Worker URL (example):

```
wss://ephemeral-relay-worker.<your-subdomain>.workers.dev/ws
```

## 2) Deploy the frontend to Pages

Build output is static files in the repo root (`index.html`, `client/`).

In Cloudflare Pages:
- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: `.`

## 3) Point frontend at Worker relay

Set the relay URL in one of these ways:

1. In `index.html` meta tag:

```html
<meta name="ws-relay-url" content="wss://ephemeral-relay-worker.<subdomain>.workers.dev/ws">
```

2. Or at runtime in browser console/local storage:

```js
localStorage.setItem('ws_relay_url', 'wss://ephemeral-relay-worker.<subdomain>.workers.dev/ws')
```

3. Or globally before app boot:

```js
window.__WS_RELAY_URL = 'wss://ephemeral-relay-worker.<subdomain>.workers.dev/ws'
```

If no explicit URL is set, the app will try:
- same-host `/ws` when running on `pages.dev` / `workers.dev`
- `ws://localhost:8080` for local Node relay dev

## 4) Local development

- Frontend (static):

```bash
python3 -m http.server 4173
```

- Existing Node relay (optional local fallback):

```bash
cd server && npm start
```
