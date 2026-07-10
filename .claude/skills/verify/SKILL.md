---
name: verify
description: Launch and drive the ValCura demo headless to verify a change end-to-end. Use when a change needs runtime verification in the real app.
---

# Verify ValCura

SPA Vite + React, no backend. The surface is the browser.

## Launch

```bash
npm run dev -- --port 5199 --strictPort   # background; ready in ~1s, check with curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/
```

## Drive headless

No Playwright in the repo. Install `playwright-core` in the session scratchpad and reuse the machine's cached Chromium:

```js
import { chromium } from "playwright-core";
const executablePath = `${homedir()}/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const browser = await chromium.launch({ executablePath });
```

(If `chromium_headless_shell-1228` is gone, `ls ~/Library/Caches/ms-playwright/` and pick the current one.)

## Flows worth driving

- Start clean: `page.evaluate(() => localStorage.clear())` then reload — state persists in `localStorage` under `valcura:state`.
- Role switching via the topbar buttons (`nav >> text=Coordinatore` etc.); state is shared across roles.
- Coordinator: fill `.request-form`, submit `.request-form .primary`, read the queue back via `.queue .request-card` (name in `strong`, `.request-meta`, `.badge`).
- Persistence: reload and re-read the queue.
- "Reset demo" restores the seed scenario (3 requests, one per status).

## Gotchas

- Seed dates are computed relative to today, so don't assert absolute dates from the seed.
- UI copy is Italian; select options by their Italian labels.
