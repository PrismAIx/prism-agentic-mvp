# Prism Agentic MVP

Prism Agentic MVP is a static product preview for reviewing deterministic planning and portfolio experiences.

## Local use

```bash
npm ci
npm run dev
npm run build:public
npm run preview
```

If the local package cache is already populated, an offline install is also available:

```bash
npm ci --offline --ignore-scripts
```

## Architecture and boundaries

This is a static, browser-only preview. It uses synthetic demo data and deterministic local mock behavior; it does not provide real AI, a backend, wallet, bank, deposit, or transaction capability. No transaction is sent, and the built preview makes no third-party runtime requests.
